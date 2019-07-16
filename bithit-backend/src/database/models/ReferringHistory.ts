import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';

@Table({
    tableName: 'referrings_history',
  })
export class ReferringHistory extends Model<ReferringHistory> {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  user_referred: string;

  @Column
  user_referring: number;

  @Column
  amount_win: number;
  
  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;
  
  @Column
  from: string;
}