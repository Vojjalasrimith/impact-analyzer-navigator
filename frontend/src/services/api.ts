import type { Entity, Relationship, GraphData, ChatTurn, ChatResponse } from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  database: string;
  uptime: number;
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  return response.json();
}

// Graph APIs
export async function fetchGraph(): Promise<GraphData> {
  const response = await fetch(`${API_BASE_URL}/graph`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.statusText}`);
  }
  return response.json();
}

// Entity APIs
export async function listEntities(): Promise<Entity[]> {
  const response = await fetch(`${API_BASE_URL}/entities`);
  if (!response.ok) {
    throw new Error(`Failed to list entities: ${response.statusText}`);
  }
  return response.json();
}

export async function createEntity(entity: Omit<Entity, 'id'>): Promise<Entity> {
  const response = await fetch(`${API_BASE_URL}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entity)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create entity: ${response.statusText}`);
  }
  return response.json();
}

export async function updateEntity(id: string, entity: Partial<Omit<Entity, 'id' | 'type'>>): Promise<Entity> {
  const response = await fetch(`${API_BASE_URL}/entities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entity)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update entity: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteEntity(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/entities/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete entity: ${response.statusText}`);
  }
}

// Relationship APIs
export async function createRelationship(rel: { from: string; to: string; type: string }): Promise<Relationship> {
  const response = await fetch(`${API_BASE_URL}/relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rel)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create relationship: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteRelationship(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/relationships/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete relationship: ${response.statusText}`);
  }
}

// Chat API
export async function sendChatMessage(message: string, history: ChatTurn[]): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to send chat message: ${response.statusText}`);
  }
  return response.json();
}

