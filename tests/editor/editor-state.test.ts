/**
 * Tests for EditorState observable-based state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@/editor/editor-state';
import type { Board } from '@/editor/types';

const sampleBoard: Board = {
  id: 'board1',
  metadata: {
    name: 'Test Board',
    version: '1.0.0',
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
    {
      id: 'page2',
      name: 'Page 2',
      rootComponent: {
        id: 'empty1',
        name: 'empty',
        type: 'variable',
        config: { value: '' },
      },
      bindings: [],
    },
  ],
};

describe('EditorState', () => {
  let state: EditorState;

  beforeEach(() => {
    state = new EditorState();
  });

  describe('initialization', () => {
    it('starts with null board', () => {
      expect(state.board.get()).toBeNull();
    });

    it('starts with null selections', () => {
      expect(state.selectedPageId.get()).toBeNull();
      expect(state.selectedComponentId.get()).toBeNull();
    });

    it('starts not dirty', () => {
      expect(state.isDirty.get()).toBe(false);
    });

    it('starts in edit mode', () => {
      expect(state.editMode.get()).toBe(true);
    });
  });

  describe('setBoard', () => {
    it('sets the board', () => {
      state.setBoard(sampleBoard);
      expect(state.board.get()).toBe(sampleBoard);
    });

    it('selects first page', () => {
      state.setBoard(sampleBoard);
      expect(state.selectedPageId.get()).toBe('page1');
    });

    it('selects first component of first page', () => {
      state.setBoard(sampleBoard);
      expect(state.selectedComponentId.get()).toBe('comp1');
    });

    it('clears dirty flag on load', () => {
      state.isDirty.set(true);
      state.setBoard(sampleBoard);
      expect(state.isDirty.get()).toBe(false);
    });

    it('handles board with empty pages', () => {
      const emptyBoard: Board = {
        ...sampleBoard,
        pages: [],
      };
      state.setBoard(emptyBoard);
      expect(state.selectedPageId.get()).toBeNull();
      expect(state.selectedComponentId.get()).toBeNull();
    });

    it('handles page with no components', () => {
      state.setBoard(sampleBoard);
      state.selectPage('page2');
      expect(state.selectedComponentId.get()).toBeNull();
    });

    it('clears board when passed null', () => {
      state.setBoard(sampleBoard);
      state.setBoard(null);
      expect(state.board.get()).toBeNull();
    });
  });

  describe('selectPage', () => {
    beforeEach(() => {
      state.setBoard(sampleBoard);
    });

    it('changes selected page', () => {
      state.selectPage('page2');
      expect(state.selectedPageId.get()).toBe('page2');
    });

    it('clears component selection', () => {
      state.selectComponent('comp1');
      state.selectPage('page2');
      expect(state.selectedComponentId.get()).toBeNull();
    });

    it('allows null selection', () => {
      state.selectPage(null);
      expect(state.selectedPageId.get()).toBeNull();
    });
  });

  describe('selectComponent', () => {
    beforeEach(() => {
      state.setBoard(sampleBoard);
    });

    it('changes selected component', () => {
      state.selectComponent('comp1');
      expect(state.selectedComponentId.get()).toBe('comp1');
    });

    it('keeps current page', () => {
      state.selectPage('page1');
      state.selectComponent('comp1');
      expect(state.selectedPageId.get()).toBe('page1');
    });

    it('allows null selection', () => {
      state.selectComponent(null);
      expect(state.selectedComponentId.get()).toBeNull();
    });
  });

  describe('dirty flag', () => {
    it('markDirty sets flag', () => {
      state.markDirty();
      expect(state.isDirty.get()).toBe(true);
    });

    it('clearDirty clears flag', () => {
      state.markDirty();
      state.clearDirty();
      expect(state.isDirty.get()).toBe(false);
    });
  });

  describe('edit mode', () => {
    it('setEditMode enables edit mode', () => {
      state.setEditMode(true);
      expect(state.editMode.get()).toBe(true);
    });

    it('setEditMode disables edit mode', () => {
      state.setEditMode(false);
      expect(state.editMode.get()).toBe(false);
    });
  });

  describe('observable subscriptions', () => {
    it('subscribes to board changes', (done) => {
      let called = false;
      state.board.onChange((board) => {
        if (called) {
          expect(board).toBe(sampleBoard);
          done();
        }
        called = true;
      });
      state.setBoard(sampleBoard);
    });

    it('subscribes to selection changes', (done) => {
      let called = false;
      state.selectedComponentId.onChange((id) => {
        if (called) {
          expect(id).toBe('comp1');
          done();
        }
        called = true;
      });
      state.selectComponent('comp1');
    });

    it('subscribes to dirty flag changes', (done) => {
      let called = false;
      state.isDirty.onChange((dirty) => {
        if (called) {
          expect(dirty).toBe(true);
          done();
        }
        called = true;
      });
      state.markDirty();
    });

    it('immediate subscribe gets current value', (done) => {
      state.setBoard(sampleBoard);
      state.board.subscribe((board) => {
        expect(board).toBe(sampleBoard);
        done();
      });
    });
  });
});
