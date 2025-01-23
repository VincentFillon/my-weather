import { Test, TestingModule } from '@nestjs/testing';
import { MoodGateway } from './mood.gateway';
import { MoodService } from './mood.service';

describe('MoodGateway', () => {
  let gateway: MoodGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MoodGateway, MoodService],
    }).compile();

    gateway = module.get<MoodGateway>(MoodGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
