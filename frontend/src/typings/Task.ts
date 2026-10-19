import ModelBase from 'App/ModelBase';

// TaskResource. lastDuration is a TimeSpan string ("00:00:01.2345678").
interface Task extends ModelBase {
  name: string;
  taskName: string;
  interval: number;
  lastExecution: string;
  lastStartTime: string;
  nextExecution: string;
  lastDuration: string;
}

export default Task;
