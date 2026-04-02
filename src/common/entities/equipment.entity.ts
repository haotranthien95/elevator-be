import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Building } from './building.entity';
import { MaintenanceReport } from './maintenance-report.entity';

@Entity({ name: 'equipment' })
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  equipmentType: string;

  @Column({ type: 'varchar', length: 80 })
  equipmentCode: string;

  @ManyToOne(() => Building, (building) => building.equipment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  building: Building;

  @OneToMany(() => MaintenanceReport, (report) => report.equipment)
  reports: MaintenanceReport[];
}
