import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';

@Table({
    tableName: 'deposits_history',
  })
export class DepositHistory extends Model<DepositHistory> {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  amount_deposited: number;

  @Column
  invoice_id: string;

  @Column
  confirmation: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
  
  @Column
  status: string;

  @Column
  userId: number;

  @Column
  tx_hash: number;
}