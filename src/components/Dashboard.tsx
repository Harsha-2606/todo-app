import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import { ref, set, update, remove, push, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';

interface Task {
  id: string | null;
  taskName: string;
  dueDate: string;
  description: string;
  priority: string;
}

interface DashboardProps {
  user: any;
  handleSignOut: () => Promise<void>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const getSafeEmail = (email: string) => email.replace(/[^a-zA-Z0-9]/g, '_');

const Dashboard: React.FC<DashboardProps> = ({ user, handleSignOut, tasks, setTasks }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      const safeEmail = getSafeEmail(user.email);
      const userTasksRef = ref(db, `users/${safeEmail}/tasks`);

      const unsubscribe = onValue(
        userTasksRef,
        (snapshot) => {
          const tasksList: Task[] = [];
          snapshot.forEach((childSnapshot) => {
            tasksList.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
            });
          });
          setTasks(tasksList);
        },
        (error) => {
          console.error('Error fetching tasks:', error);
          alert('Failed to fetch tasks. Please try again later.');
        }
      );

      return () => unsubscribe();
    }
  }, [user?.email, setTasks]);

  const addOrUpdateTaskInline = async () => {
    if (taskName.trim()) {
      const safeEmail = getSafeEmail(user.email);
      const userTasksRef = ref(db, `users/${safeEmail}/tasks`);

      if (editingTaskId) {
        const taskRef = ref(db, `users/${safeEmail}/tasks/${editingTaskId}`);
        await update(taskRef, { taskName, dueDate, description, priority });
      } else {
        const newTaskRef = push(userTasksRef);
        await set(newTaskRef, { taskName, dueDate, description, priority });
      }

      clearTaskForm();
      setIsAddingTask(false);
    } else {
      alert('Task name is required.');
    }
  };

  const handleEditTaskInline = (task: Task) => {
    setTaskName(task.taskName);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setEditingTaskId(task.id);
    setIsAddingTask(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const safeEmail = getSafeEmail(user.email);
      const taskRef = ref(db, `users/${safeEmail}/tasks/${taskId}`);
      await remove(taskRef);
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete the task.');
    }
  };

  const clearTaskForm = () => {
    setTaskName('');
    setDescription('');
    setDueDate('');
    setPriority('Normal');
    setEditingTaskId(null);
    setIsAddingTask(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-details">
        <div className="header-details">
          <div className="header-image">
            <img src="/images/todoist image.png" alt="" />
          </div>
          <header className="dashboard-header">
            <h1>Welcome, {user?.displayName}!</h1>
          </header>
        </div>
        <div className="dashboard-button">
          <button onClick={handleSignOut}>
            <FontAwesomeIcon icon={faRightFromBracket} /> Sign Out
          </button>
        </div>
      </div>

      <main>
        <h2>Today</h2>
        {!isAddingTask && (
          <button className="add-task-button" onClick={() => setIsAddingTask(true)}>
            <div className="icon-container">
              <FontAwesomeIcon icon={faPlus} className="plus-icon" />
            </div>{' '}
            <span>Add task</span>
          </button>
        )}
        {isAddingTask && (
          <div className="task-form">
            <div className="input-fields">
              <input
                className="input1"
                type="text"
                placeholder="Task name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              <textarea
                className="input2"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="due-prior">
              <input
                className="duedate"
                placeholder="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <select
                className="priority"
                title="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Priority 1</option>
                <option value="Normal">Priority 2</option>
                <option value="High">Priority 3</option>
              </select>
            </div>

            <div className="form-buttons">
              <div className="twobuttons">
                <button className="cancel-button" onClick={clearTaskForm}>
                  Cancel
                </button>
                <button className="add-button" onClick={addOrUpdateTaskInline}>
                  {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="task-list">
          {tasks.length > 0 &&
            tasks.map((task) => {
              const taskId = task.id ?? `fallback-id-${task.taskName}`;

              return (
                <div key={taskId} className="task-item">
                  <div className="task-details">
                    <h3>{task.taskName}</h3>
                    <p>{task.description}</p>
                    </div>
                    <div className='task-details2'>
                      <div className='task-more-details'>
                    <p>Due: {task.dueDate || 'No due date'}</p>
                    <p>Priority: {task.priority}</p>
                    </div>
                    <div className="task-actions">
                    <button className='edit-btn' onClick={() => handleEditTaskInline(task)}>Edit</button>
                    <button className='delete-btn' onClick={() => handleDeleteTask(taskId)}>Delete</button>
                  </div>
                    </div>
                </div>
              );
            })}
        </div>
      </main>

      {!isAddingTask && tasks.length === 0 && (
        <div className="image-details-container">
          <div className="image">
            <img src="/images/dashboard-image.png" alt="" />
          </div>
          <div className="image-details">
            <h4>What do you need to get done today?</h4>
            <p>By default, tasks added here will be due today. Click + to add a task.</p>
            <a
              href="https://todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faCircleQuestion} className="question-icon" /> How to plan
              your day
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;