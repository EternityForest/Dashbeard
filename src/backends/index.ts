/**
 * Storage abstraction layer for boards.
 * Different backends can persist boards in
 * various ways (filesystem, database, API, etc).
 */

import type {
  BoardDefinition,
  IBoardBackend,
} from '../editor/types';


// Sample board for testing
// Uses unified BoardDefinition format
export const defaultBoard: BoardDefinition = {
  id: 'test-board-1',
  metadata: {
    name: 'Example Dashboard',
    version: '1.0.0',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  rootComponent: {
    id: 'layout-1',
    type: 'flex-layout',
    config: {
      direction: 'column',
      gap: '1rem',
    },
    children: [
      {
        id: 'comp-1',
        type: 'slider',
        config: {
          min: 0,
          max: 100,
          defaultValue: 50,
          label: 'Value',
        },
      },
      {
        id: 'comp-2',
        type: 'variable',
        config: {
          defaultValue: 'Hello World',
          label: 'Output',
        },
      },
    ],
  },
  bindings: [],
};

/**
 * In-memory storage backend.
 * Useful for development and testing.
 */
export class MemoryBackend implements IBoardBackend {
  private boards = new Map<string, BoardDefinition>();

  async load(
    id: string
  ): Promise<BoardDefinition> {
    const board = this.boards.get(id);
    if (!board) {
      return defaultBoard;
    }
    return JSON.parse(JSON.stringify(board));
  }

  async save(board: BoardDefinition): Promise<void> {
    board.metadata.modified = new Date().toISOString();
    this.boards.set(
      board.id,
      JSON.parse(JSON.stringify(board))
    );
  }

  async create(
    board: BoardDefinition
  ): Promise<string> {
    const id = `board_${Date.now()}`;
    board.id = id;
    board.metadata.created = new Date().toISOString();
    board.metadata.modified = new Date().toISOString();
    await this.save(board);
    return id;
  }

  async delete(id: string): Promise<void> {
    if (!this.boards.has(id)) {
      throw new Error(`Board not found: ${id}`);
    }
    this.boards.delete(id);
  }

  async list(): Promise<BoardDefinition[]> {
    return Array.from(this.boards.values()).map((b) =>
      JSON.parse(JSON.stringify(b))
    );
  }

  /**
   * Clear all boards (for testing).
   */
  clear(): void {
    this.boards.clear();
  }

  /**
   * Directly add a board (for testing).
   */
  addBoard(board: BoardDefinition): void {
    this.boards.set(board.id, board);
  }
}

/**
 * LocalStorage backend.
 * Persists boards in browser storage.
 */
export class LocalStorageBackend
  implements IBoardBackend {
  private prefix = 'dashbeard_board_';

  async load(
    id: string
  ): Promise<BoardDefinition> {
    const key = this.prefix + id;
    const json = localStorage.getItem(key);
    if (!json) {
      throw new Error(`Board not found: ${id}`);
    }
    return JSON.parse(json);
  }

  async save(
    board: BoardDefinition
  ): Promise<void> {
    board.metadata.modified = new Date().toISOString();
    const key = this.prefix + board.id;
    localStorage.setItem(key, JSON.stringify(board));
  }

  async create(
    board: BoardDefinition
  ): Promise<string> {
    const id = `board_${Date.now()}`;
    board.id = id;
    board.metadata.created = new Date().toISOString();
    board.metadata.modified = new Date().toISOString();
    await this.save(board);
    return id;
  }

  async delete(id: string): Promise<void> {
    const key = this.prefix + id;
    localStorage.removeItem(key);
  }

  async list(): Promise<BoardDefinition[]> {
    const boards: BoardDefinition[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const json = localStorage.getItem(key);
        if (json) {
          boards.push(JSON.parse(json));
        }
      }
    }
    return boards;
  }
}

/**
 * API-based backend.
 * Communicates with a server to persist boards.
 */
export class ApiBackend implements IBoardBackend {
  constructor(
    private baseUrl: string = '/api/boards'
  ) {}

  async load(
    id: string
  ): Promise<BoardDefinition> {
    const response = await fetch(
      `${this.baseUrl}/${id}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load board: ${response.statusText}`
      );
    }
    return response.json();
  }

  async save(
    board: BoardDefinition
  ): Promise<void> {
    board.metadata.modified = new Date().toISOString();
    const response = await fetch(
      `${this.baseUrl}/${board.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(board),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to save board: ${response.statusText}`
      );
    }
  }

  async create(
    board: BoardDefinition
  ): Promise<string> {
    board.metadata.created = new Date().toISOString();
    board.metadata.modified = new Date().toISOString();
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(board),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to create board: ${response.statusText}`
      );
    }
    const data = await response.json();
    return data.id;
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${id}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to delete board: ${response.statusText}`
      );
    }
  }

  async list(): Promise<BoardDefinition[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to list boards: ${response.statusText}`
      );
    }
    return response.json();
  }
}

/**
 * Composite backend that uses a primary
 * and falls back to secondary.
 */
export class CompositeBackend
  implements IBoardBackend {
  constructor(
    private primary: IBoardBackend,
    private secondary: IBoardBackend
  ) {}

  async load(
    id: string
  ): Promise<BoardDefinition> {
    try {
      return await this.primary.load(id);
    } catch (err) {
      console.warn(
        'Primary backend failed, trying secondary:',
        err
      );
      return this.secondary.load(id);
    }
  }

  async save(
    board: BoardDefinition
  ): Promise<void> {
    try {
      await this.primary.save(board);
    } catch (err) {
      console.warn(
        'Primary save failed, trying secondary:',
        err
      );
      await this.secondary.save(board);
    }
  }

  async create(
    board: BoardDefinition
  ): Promise<string> {
    try {
      return await this.primary.create(board);
    } catch (err) {
      console.warn(
        'Primary create failed, trying secondary:',
        err
      );
      return this.secondary.create(board);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.primary.delete(id);
    } catch (err) {
      console.warn(
        'Primary delete failed, trying secondary:',
        err
      );
      await this.secondary.delete(id);
    }
  }

  async list(): Promise<BoardDefinition[]> {
    try {
      return await this.primary.list();
    } catch (err) {
      console.warn(
        'Primary list failed, trying secondary:',
        err
      );
      return this.secondary.list();
    }
  }
}
