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

def update_task(task_id: str, status: str, message: str, result: Dict[str, Any] = None, webhook_url: str = None):
    tasks = get_tasks()
    
    # If task already exists, preserve its existing webhook_url unless a new one is provided
    existing_webhook_url = tasks.get(task_id, {}).get("webhook_url")
    final_webhook_url = webhook_url or existing_webhook_url
    
    task_data = {
        "status": status,
        "message": message,
        "result": result,
        "updated_at": datetime.now().isoformat(),
        "webhook_url": final_webhook_url
    }
    tasks[task_id] = task_data
    _save_json(TASKS_FILE, tasks)
    
    # Trigger real-time WebSocket updates
    asyncio.create_task(manager.broadcast_task_update(task_id, task_data))
    
    # Trigger webhooks on status change
    asyncio.create_task(dispatch_webhooks(f"task.{status}", task_data))

def get_task(task_id: str) -> Dict[str, Any]:
    return get_tasks().get(task_id)

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
