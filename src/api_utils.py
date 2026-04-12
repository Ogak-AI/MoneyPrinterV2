import os
import json
import httpx
import asyncio
from datetime import datetime
from typing import Dict, Any, List
from fastapi import WebSocket
from config import ROOT_DIR
from status import info, success, error, warning

TASKS_FILE = os.path.join(ROOT_DIR, ".mp", "tasks.json")
WEBHOOKS_FILE = os.path.join(ROOT_DIR, ".mp", "webhooks.json")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)

    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]

    async def broadcast_task_update(self, task_id: str, data: Dict[str, Any]):
        if task_id in self.active_connections:
            message = {
                "task_id": task_id,
                **data
            }
            for connection in self.active_connections[task_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection likely closed
                    pass

manager = ConnectionManager()

def _load_json(file_path: str, default: Any) -> Any:
    if not os.path.exists(file_path):
        return default
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except Exception:
        return default

def _save_json(file_path: str, data: Any):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)

def get_tasks() -> Dict[str, Any]:
    return _load_json(TASKS_FILE, {})

def update_task(task_id: str, status: str, message: str, result: Dict[str, Any] = None, webhook_url: str = None, provider: str = None):
    tasks = get_tasks()
    
    # If task already exists, preserve its existing webhook_url and provider unless new ones are provided
    existing = tasks.get(task_id, {})
    existing_webhook_url = existing.get("webhook_url")
    existing_provider = existing.get("provider")
    
    final_webhook_url = webhook_url or existing_webhook_url
    final_provider = provider or existing_provider
    
    task_data = {
        "status": status,
        "message": message,
        "result": result,
        "updated_at": datetime.now().isoformat(),
        "webhook_url": final_webhook_url,
        "provider": final_provider
    }
    tasks[task_id] = task_data
    _save_json(TASKS_FILE, tasks)
    
    # Trigger real-time WebSocket and webhook updates safely from any thread
    try:
        loop = asyncio.get_running_loop()
        # We're inside an async context — use create_task directly
        loop.create_task(manager.broadcast_task_update(task_id, task_data))
        loop.create_task(dispatch_webhooks(f"task.{status}", task_data))
    except RuntimeError:
        # No running loop on this thread (sync endpoint in threadpool).
        # Schedule onto the main event loop instead.
        try:
            loop = asyncio.get_event_loop()
            asyncio.run_coroutine_threadsafe(manager.broadcast_task_update(task_id, task_data), loop)
            asyncio.run_coroutine_threadsafe(dispatch_webhooks(f"task.{status}", task_data), loop)
        except Exception:
            # Silently skip if there's no event loop at all (e.g. during tests)
            pass

def get_task(task_id: str) -> Dict[str, Any]:
    return get_tasks().get(task_id)

def delete_task_record(task_id: str) -> bool:
    """Remove a task from the task store. Returns True if it existed, False otherwise."""
    tasks = get_tasks()
    if task_id not in tasks:
        return False
    del tasks[task_id]
    _save_json(TASKS_FILE, tasks)
    return True

def get_webhooks() -> List[Dict[str, Any]]:
    return _load_json(WEBHOOKS_FILE, [])

def add_webhook(subscription: Dict[str, Any]):
    webhooks = get_webhooks()
    webhooks.append(subscription)
    _save_json(WEBHOOKS_FILE, webhooks)

async def dispatch_webhooks(event: str, data: Dict[str, Any]):
    webhooks = get_webhooks()
    
    # If task has a specific webhook_url, add it to the list to notify
    task_webhook_url = data.get("webhook_url")
    
    payload = {
        "event": event,
        "timestamp": datetime.now().isoformat(),
        "data": data
    }
    
    async with httpx.AsyncClient() as client:
        # Notify global subscribers
        for webhook in webhooks:
            if event in webhook["events"] or "*" in webhook["events"]:
                try:
                    await client.post(webhook["url"], json=payload, timeout=10)
                except Exception as e:
                    warning(f"Failed to send webhook to {webhook['url']}: {e}")
        
        # Notify per-task subscriber
        if task_webhook_url:
            try:
                await client.post(task_webhook_url, json=payload, timeout=10)
            except Exception as e:
                warning(f"Failed to send task-specific webhook to {task_webhook_url}: {e}")
