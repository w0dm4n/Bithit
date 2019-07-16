import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';

@Table({
    tableName: 'deposits',
  })
export class Deposit extends Model<Deposit> {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  invoice_id: string;

  @Column
  user_id: number;

  @Column
  address: string;

  @UpdatedAt
  updatedAt: Date;

  @CreatedAt
  createdAt: Date;
}