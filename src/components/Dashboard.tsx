import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faFilter, faHome, faLaptop, faPlus, faRightFromBracket, faSchool, faSearch } from '@fortawesome/free-solid-svg-icons';
import { faCalendar, faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import { ref, set, update, remove, push, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';

interface Task {
  id: string;
  taskName: string;
  dueDate: string;
  description: string;
  priority: string;
  reminderTime?: string;
  tag: string;
  completed?: boolean;
}

interface DashboardProps {
  user: any;
  handleSignOut: () => Promise<void>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const getSafeEmail = (email: string) => email.replace(/[.@]/g, '_');

const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', options).replace(',', '');
};

const Dashboard: React.FC<DashboardProps> = ({ user, handleSignOut, tasks, setTasks }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [reminderPopupVisible, setReminderPopupVisible] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [tag, setTag] = useState('Home');
  const [, setIsFiltering] = useState(false);
  const [activeButton, setActiveButton] = useState<'Today' | 'Filter'>('Today');
  const [filterCriteria, setFilterCriteria] = useState({
    priority: '',
    dueDate: '',
    tag: '',
});

  useEffect(() => {
    const now = Date.now();

    tasks.forEach((task) => {
      if (task.reminderTime) {
        const reminderTimestamp = new Date(task.reminderTime).getTime();
        if (reminderTimestamp > now) {
          const timeToReminder = reminderTimestamp - now;
          
          setTimeout(() => {
            alert(`🔔 Reminder: It's time for "${task.taskName}"!`);
          }, timeToReminder);
        }
      }
    });
  }, [tasks]);

  useEffect(() => {
    if (user?.email) {
      const safeEmail = getSafeEmail(user.email);
      const userTasksRef = ref(db, `users/${safeEmail}/tasks`);

      const unsubscribe = onValue(
        userTasksRef,
        (snapshot) => {
          const tasksList: Task[] = [];
          snapshot.forEach((childSnapshot) => {
            const task = {
              id: childSnapshot.key,
              ...childSnapshot.val(),
            };
            tasksList.push(task);
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

  useEffect(() => {
    const savedActiveButton = localStorage.getItem('activeButton');
    const validSavedActiveButton = savedActiveButton as 'Today' | 'Filter' | null;

    if (validSavedActiveButton) {
      setActiveButton(validSavedActiveButton);
    } else {
      setActiveButton('Today');
    }
  }, []);
  
  const handleViewSwitch = (button: 'Today' | 'Filter') => {
    setActiveButton(button);
    setIsFiltering(button === 'Filter');
    localStorage.setItem('activeButton', button);
  };


  useEffect(() => {
    localStorage.setItem('filterCriteria', JSON.stringify(filterCriteria));
  }, [filterCriteria]);
  
  useEffect(() => {
    const savedFilterCriteria = localStorage.getItem('filterCriteria');
    if (savedFilterCriteria) {
      setFilterCriteria(JSON.parse(savedFilterCriteria));
    }
  }, []);

  const visibleTasks = tasks.filter((task) => !task.completed);
  

  const addOrUpdateTaskInline = async () => {
    if (taskName.trim()) {
      const safeEmail = getSafeEmail(user.email);
      const userTasksRef = ref(db, `users/${safeEmail}/tasks`);

      const newTask = {
        taskName, 
        dueDate, 
        description, 
        priority, 
        reminderTime,
        tag,
      }

      if (editingTaskId) {
        const taskRef = ref(db, `users/${safeEmail}/tasks/${editingTaskId}`);
        await update(taskRef, newTask);
      } else {
        const newTaskRef = push(userTasksRef);
        await set(newTaskRef, newTask);
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

  const handleCompleteTask = async (taskId: string) => {
    try {
      const safeEmail = getSafeEmail(user.email);
      const taskRef = ref(db, `users/${safeEmail}/tasks/${taskId}`);

      await update(taskRef, { completed: true });

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to mark the task as completed.');
    }
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
    setReminderTime('');
    setReminderPopupVisible(false);
    setEditingTaskId(null);
    setIsAddingTask(false);
    setTag('Home');
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
        <div className='dashboard-actions-form'>
        <div className='dashboard-actions'>
          <button className='db-search'><FontAwesomeIcon icon={faSearch} />Search</button>
          <button className={`db-today ${activeButton === 'Today' ? 'active' : ''}`} onClick={() => handleViewSwitch('Today')}>
            <FontAwesomeIcon icon={faCalendar} />Today</button>
          <button className={`db-filter ${activeButton === 'Filter' ? 'active' : ''}`} onClick={() => handleViewSwitch('Filter')}>
            <FontAwesomeIcon icon={faFilter} />Filter Tasks</button>
        </div>
      </div>
        <div className="dashboard-button" onClick={handleSignOut}>
          <button>
            <FontAwesomeIcon icon={faRightFromBracket} /> <span className='signout'>Sign Out</span>
          </button>
        </div>
      </div>

      {activeButton === 'Filter' && (
        <div className="filter-container">
          <h2>Filter Tasks</h2>
          <div className="filter-options">
            <label>
              Priority:
              <select
              className='p-select'
                value={filterCriteria.priority}
                onChange={(e) =>
                  setFilterCriteria({
                    ...filterCriteria,
                    priority: e.target.value,
                  })
                }
              >
                <option value="">All</option>
                <option value="Low">Priority 1</option>
                <option value="Normal">Priority 2</option>
                <option value="High">Priority 3</option>
              </select>
            </label>

            <label>
              Due Date:
              <input
                className='dd-select'
                type="date"
                value={filterCriteria.dueDate}
                onChange={(e) =>
                  setFilterCriteria({
                    ...filterCriteria,
                    dueDate: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Tag:
              <select
                className='tag-select'
                value={filterCriteria.tag}
                onChange={(e) =>
                  setFilterCriteria({
                    ...filterCriteria,
                    tag: e.target.value,
                  })
                }
              >
                <option value="">All</option>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Education">Education</option>
              </select>
            </label>
          </div>

          <button
            className="apply-filters-btn"
            onClick={() => {
              setActiveButton('Today');
              setIsFiltering(false);
            }}
          >
            Apply Filters
          </button>
        </div>
      )}


    {activeButton === 'Today' && (
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

              <button
                className="reminder"
                onClick={(e) => { e.stopPropagation(); setReminderPopupVisible(!reminderPopupVisible); }}
              >
                {reminderTime ? `Reminder: ${reminderTime}` : 'Set Reminder'}
              </button>

              {reminderPopupVisible && (
                <div className="reminder-popup">
                  <input
                    type="datetime-local"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    placeholder="Set reminder"
                  />
                  <button onClick={(e) => { e.stopPropagation(); setReminderPopupVisible(false); }}>Save</button>
                </div>
              )}
            </div>

            <div className="form-buttons">
            <select
              className="filter-tasks"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option><FontAwesomeIcon icon={faHome} />Home</option>
              <option><FontAwesomeIcon icon={faLaptop} />Work</option>
              <option><FontAwesomeIcon icon={faSchool} />Education</option>
                    </select>
              <div className="twobuttons">
                <button className="cancel-button" onClick={clearTaskForm}>
                  Cancel
                </button>
                <button className={editingTaskId ? 'update-button' : 'add-button'} onClick={addOrUpdateTaskInline}>
                   {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        )}

       {activeButton === 'Today' && (
        <div className="task-list">
          {visibleTasks
            .filter((task) => 
            (!filterCriteria.priority || task.priority === filterCriteria.priority) &&
            (!filterCriteria.dueDate || task.dueDate === filterCriteria.dueDate) &&
            (!filterCriteria.tag || task.tag === filterCriteria.tag)
            )
            .map((task) => {
              const taskId = task.id ?? `fallback-id-${task.taskName}`;

              return (
                <div key={taskId} className="task-item">
                  <div className="task-details">
                    <h3>{task.taskName}</h3>
                    <p>{task.description}</p>
                    <span onClick={() => handleCompleteTask(taskId)} className='check-task'>
                      <FontAwesomeIcon icon={faCheck} className='checked' />
                    </span>
                  </div>
                  <div className="task-details2">
                    <div className="task-more-details">
                      <p>Due: {task.dueDate || 'No due date'}</p>
                      <p>Priority: {task.priority}</p>
                      <p>{task.reminderTime
                          ? `Reminder: ${formatDateTime(task.reminderTime)}`
                          : 'No Reminder'}</p>
                    </div>
                    <p className='filtered-task'># {task.tag || 'No Tag'}</p>
                    <div className="task-actions">
                      <button className="edit-btn" onClick={() => handleEditTaskInline(task)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeleteTask(taskId)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
       )}
      </main>
      )}

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
              rel="noreferrer noopener"
            >
              <FontAwesomeIcon icon={faCircleQuestion} className="question-icon" /> How to plan
              your day
            </a>
          </div>
        </div>
      )}

      {!isAddingTask && tasks.length > 0 && tasks.every((task) => task.completed) && (
      <div className="image-details-container-1">
        <div className="image-1">
          <img src="/images/dashboard-image-1.png" alt="" />
        </div>
        <div className="image-details-1">
          <h4>You're all done for the week, {user?.displayName}!</h4>
          <p>Enjoy the rest of your day and don't forget to share your #TodoistZero awesomeness ↓</p>
          <a href="https://www.facebook.com/groups/todoistmadesimple/" target='_blank' rel='noreferrer noopener'>Share #TodoistZero</a>
        </div>
      </div>
      )}
    </div>
  );
};

export default Dashboard;