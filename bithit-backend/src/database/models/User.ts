import {Table, Column, Model, HasMany, AutoIncrement, UpdatedAt, CreatedAt, PrimaryKey} from 'sequelize-typescript';

@Table({
    tableName: 'users',
  })
export class User extends Model<User> {

  @AutoIncrement
  @PrimaryKey
  @Column
  id: number;

  @Column
  email: string;

  @Column
  username: string;

  @Column
  password: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  balance_bht: number;

  @Column
  last_session: string;

  @Column
  muted: boolean;

  @Column
  admin: boolean;

  @Column
  locked: boolean;

  @Column
  referred_by: number
}