import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Equipment } from './equipment.entity';

@Entity({ name: 'buildings' })
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @OneToMany(() => Equipment, (equipment) => equipment.building)
  equipment: Equipment[];
}
