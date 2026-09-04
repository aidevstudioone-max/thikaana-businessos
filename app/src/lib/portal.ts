import { useAuth } from '../context/AuthContext'
import { COLLECTIONS, getAll } from './db'
import type { Department, Employee } from './types'

// The employee record the logged-in employee account is attached to.
export function useMyEmployee(): { employee?: Employee; department?: Department; manager?: Employee } {
  const { user } = useAuth()
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const employee = employees.find((e) => e.id === user?.linkedEmployeeId)
  const department = getAll<Department>(COLLECTIONS.departments).find((d) => d.id === employee?.departmentId)
  const manager = employees.find((e) => e.id === employee?.reportingManagerId)
  return { employee, department, manager }
}
