import { Test, TestingModule } from '@nestjs/testing';
import { TicTacToeService } from './tic-tac-toe.service';

describe('TicTacToeService', () => {
  let service: TicTacToeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicTacToeService],
    }).compile();

    service = module.get<TicTacToeService>(TicTacToeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
