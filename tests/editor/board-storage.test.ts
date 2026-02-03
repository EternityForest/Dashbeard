/**
 * Tests for board storage backends.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryBackend,
  LocalStorageBackend,
} from '@/backends';
import type { Board } from '@/editor/types';

const sampleBoard: Board = {
  id: 'test_board',
  metadata: {
    name: 'Test Board',
    description: 'A test board',
    version: '1.0.0',
    author: 'Test',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  pages: [
    {
      id: 'page1',
      name: 'Page 1',
      rootComponent: {
        id: 'comp1',
        name: 'slider',
        type: 'slider',
        config: { min: 0, max: 100 },
      },
      bindings: [],
    },
  ],
};

describe('MemoryBackend', () => {
  let backend: MemoryBackend;

  beforeEach(() => {
    backend = new MemoryBackend();
  });

  describe('create', () => {
    it('creates a new board', async () => {
      const board = { ...sampleBoard, id: '' };
      const id = await backend.create(board);
      expect(id).toMatch(/^board_\d+$/);
    });

    it('sets created and modified timestamps', async () => {
      const board = { ...sampleBoard, id: '' };
      await backend.create(board);
      expect(board.metadata.created).toBeDefined();
      expect(board.metadata.modified).toBeDefined();
    });
  });

  describe('save', () => {
    it('persists a board', async () => {
      const board = { ...sampleBoard };
      await backend.save(board);
      const loaded = await backend.load(board.id);
      expect(loaded.metadata.name).toBe(
        board.metadata.name
      );
    });

    it('updates modified timestamp', async () => {
      const board = { ...sampleBoard };
      const oldModified = board.metadata.modified;
      await new Promise((r) => setTimeout(r, 10));
      await backend.save(board);
      expect(board.metadata.modified).not.toBe(
        oldModified
      );
    });
  });

  describe('load', () => {
    it('loads a saved board', async () => {
      const board = { ...sampleBoard };
      await backend.save(board);
      const loaded = await backend.load(board.id);
      expect(loaded.id).toBe(board.id);
      expect(loaded.metadata.name).toBe(
        board.metadata.name
      );
    });

    it('throws for missing board', async () => {
      await expect(backend.load('missing')).rejects.toThrow(
        'not found'
      );
    });

    it('returns a copy not a reference', async () => {
      const board = { ...sampleBoard };
      await backend.save(board);
      const loaded = await backend.load(board.id);
      loaded.metadata.name = 'Modified';
      const reloaded = await backend.load(board.id);
      expect(reloaded.metadata.name).toBe(
        'Test Board'
      );
    });
  });

  describe('delete', () => {
    it('removes a board', async () => {
      const board = { ...sampleBoard };
      await backend.save(board);
      await backend.delete(board.id);
      await expect(backend.load(board.id)).rejects.toThrow(
        'not found'
      );
    });

    it('throws for missing board', async () => {
      await expect(backend.delete('missing')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('list', () => {
    it('returns all boards', async () => {
      const board1 = { ...sampleBoard, id: 'b1' };
      const board2 = { ...sampleBoard, id: 'b2' };
      await backend.save(board1);
      await backend.save(board2);
      const boards = await backend.list();
      expect(boards).toHaveLength(2);
      expect(boards.map((b) => b.id)).toContain('b1');
      expect(boards.map((b) => b.id)).toContain('b2');
    });

    it('returns empty list when no boards', async () => {
      const boards = await backend.list();
      expect(boards).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('removes all boards', async () => {
      await backend.save(sampleBoard);
      backend.clear();
      const boards = await backend.list();
      expect(boards).toHaveLength(0);
    });
  });
});

if (typeof localStorage !== 'undefined') {
  describe('LocalStorageBackend', () => {
    let backend: LocalStorageBackend;

    beforeEach(() => {
      backend = new LocalStorageBackend();
      localStorage.clear();
    });

    describe('create', () => {
      it('creates a new board', async () => {
        const board = { ...sampleBoard, id: '' };
        const id = await backend.create(board);
        expect(id).toMatch(/^board_\d+$/);
      });

      it('stores in localStorage', async () => {
        const board = { ...sampleBoard, id: '' };
        await backend.create(board);
        const keys = Object.keys(localStorage);
        expect(
          keys.some((k) =>
            k.startsWith('dashbeard_board_')
          )
        ).toBe(true);
      });
    });

    describe('save', () => {
      it('persists a board', async () => {
        const board = { ...sampleBoard };
        await backend.save(board);
        const loaded = await backend.load(board.id);
        expect(loaded.metadata.name).toBe(
          board.metadata.name
        );
      });
    });

    describe('load', () => {
      it('loads from localStorage', async () => {
        const board = { ...sampleBoard };
        await backend.save(board);
        const loaded = await backend.load(board.id);
        expect(loaded.id).toBe(board.id);
      });

      it('throws for missing board', async () => {
        await expect(backend.load('missing')).rejects.toThrow(
          'not found'
        );
      });
    });

    describe('delete', () => {
      it('removes from localStorage', async () => {
        const board = { ...sampleBoard };
        await backend.save(board);
        await backend.delete(board.id);
        await expect(backend.load(board.id)).rejects.toThrow(
          'not found'
        );
      });
    });

    describe('list', () => {
      it('lists all persisted boards', async () => {
        const board1 = { ...sampleBoard, id: 'b1' };
        const board2 = { ...sampleBoard, id: 'b2' };
        await backend.save(board1);
        await backend.save(board2);
        const boards = await backend.list();
        expect(boards.length).toBeGreaterThanOrEqual(2);
      });
    });
  });
}
