import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';
import {Bet} from "../../objects/Bet"

@Table({
    tableName: 'games',
  })
export class Game extends Model<Game> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  game_hash: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  result: number;

  bets: Bet[];
  canBet: boolean;
  timeEnd: Date;
  indice: number;
}