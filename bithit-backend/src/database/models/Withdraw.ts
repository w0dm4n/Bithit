import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';

@Table({
    tableName: 'withdrawals',
  })
export class Withdraw extends Model<Withdraw> {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  amount: number;

  @Column
  user_id: number;

  @Column
  state: number;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @Column
  address: string;

  @Column
  tx_hash: string;
}