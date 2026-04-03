import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'technicians' })
export class Technician {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  team: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  specialty: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
