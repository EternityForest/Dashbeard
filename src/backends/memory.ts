import type {
  BoardDefinition,
  FileMetadata,
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
    id: 'root',
    type: 'plain-layout',
    config: {
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

  async listResourceFolder(
    _boardid: string,
    folder: string
  ): Promise<FileMetadata[]> {
    if (folder == '/') {
      return [
        {
          name: 'dot.png',
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==',
          size: 85,
          type: 'file',
        },
        {
          name: 'red.css',
          url: 'data:text/css;charset=utf-8;base64,OnJvb3Qgew0KICAtLWJnOiByZWQ7DQogIC0tYm94LWJnOiByZWQ7DQp9',
          size: 1000,
          type: 'file',
        },
      ];
    } else {
      throw new Error('No such folder ' + folder);
    }
  }

  async load(id: string): Promise<BoardDefinition> {
    const board = this.boards.get(id);
    if (!board) {
      return defaultBoard as unknown as BoardDefinition;
    }
    return JSON.parse(JSON.stringify(board)) as unknown as BoardDefinition;
  }

  async save(board: BoardDefinition): Promise<void> {
    board.metadata.modified = new Date().toISOString();
    this.boards.set(
      board.id,
      JSON.parse(JSON.stringify(board)) as unknown as BoardDefinition
    );
  }
}
