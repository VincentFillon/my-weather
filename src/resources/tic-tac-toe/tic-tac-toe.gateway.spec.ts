import { Test, TestingModule } from '@nestjs/testing';
import { TicTacToeGateway } from './tic-tac-toe.gateway';
import { TicTacToeService } from './tic-tac-toe.service';

describe('TicTacToeGateway', () => {
  let gateway: TicTacToeGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicTacToeGateway, TicTacToeService],
    }).compile();

    gateway = module.get<TicTacToeGateway>(TicTacToeGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
