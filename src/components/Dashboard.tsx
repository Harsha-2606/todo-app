import React, { useState, useEffect } from 'react';
import { ref, set, update, remove, push, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faFilter, faMultiply, faPlus, faRightFromBracket, faSearch } from '@fortawesome/free-solid-svg-icons';
import { faCalendar, faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

interface Task {
  order: any;
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
  const [activeButton, setActiveButton] = useState('Today');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const tags = ['Home', 'Work', 'Education'];
  const priorities = ['Low', 'Normal', 'High'];
  const dueDateFilters = ['Overdue', 'due-Today'];


const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

const handleFilterChange = (filter: string) => {
  setSelectedFilters((prevFilters) =>
    prevFilters.includes(filter)
      ? prevFilters.filter((f) => f !== filter)
      : [...prevFilters, filter]
  );
};

const clearFilters = () => {
  setSelectedFilters([]);
};

const filteredTasks = tasks.filter((task) => {
  if (!selectedFilters.includes('Completed') && task.completed) {
    return false;
  }
  if (selectedFilters.length> 0) {
    return selectedFilters.every((filter) => {
      if (tags.includes(filter)) return task.tag === filter;
      if (priorities.includes(filter)) return task.priority === filter;
      if (dueDateFilters.includes(filter)) {
        if (filter === 'Overdue') return new Date(task.dueDate) < new Date();
        if (filter === 'Today') return new Date(task.dueDate).toDateString() === new Date().toDateString();
      }
      return false;
    });
  }
  return !task.completed;
  });

const handleDragEnd = (result: any) => {
  const { destination, source } = result;

  if (!destination) return;
  if (destination.index === source.index) return;

  const reorderedTasks = Array.from(tasks);
  const [removed] = reorderedTasks.splice(source.index, 1);
  reorderedTasks.splice(destination.index, 0, removed);

  setTasks(reorderedTasks);

  const safeEmail = getSafeEmail(user.email);

  reorderedTasks.forEach((task, index) => {
    const taskRef = ref(db, `users/${safeEmail}/tasks/${task.id}`);
    update(taskRef, { order: index });
  });
};


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

          tasksList.sort((a, b) => a.order - b.order);

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
    const savedActiveButton = localStorage.getItem('activeButton') as 'Today';
    setActiveButton(savedActiveButton || 'Today');
  }, []);

  useEffect(() => {
    localStorage.setItem('activeButton', activeButton);
  }, [activeButton]);

  const visibleTasks = filteredTasks;

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
          <button className={`db-today ${activeButton === 'Today' ? 'active' : ''}`} onClick={() => setActiveButton('Today')}>
            <FontAwesomeIcon icon={faCalendar} />Today</button>
            <div className='filter-dropdown'>
          <button className={`db-filter ${dropdownVisible ? 'active' : ''}`} onClick={toggleDropdown}>
            <FontAwesomeIcon icon={faFilter} />Filter Tasks</button>
            {dropdownVisible && (
              <div className='dropdown-content'>
                <div className='si-sf'>
                <FontAwesomeIcon className='searchIcon' icon={faSearch} /><input type="text" className="dropdown-search" placeholder="Search Filters" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                </div>
                {tags 
                  .concat(priorities)
                  .concat(dueDateFilters)
                  .filter((filter) =>
                    filter.toLowerCase().includes(searchQuery.toLowerCase())
              )
                .map((filter) => (
                  <div key={filter} className='dropdown-item'>
                    <label>
                      <input type='checkbox' checked={selectedFilters.includes(filter)} onChange={() => handleFilterChange(filter)} />{filter}
                    </label>
                  </div>
                ))}
                {selectedFilters.length > 0 && (
                <div className='clear-filters' onClick={clearFilters}>
                  <FontAwesomeIcon className='multiply' icon={faMultiply} /><button className='clear-filters-btn'>Clear Filters</button>
                  </div>
                )}
              </div>
            )}
            </div>
        </div>
      </div>
        <div className="dashboard-button" onClick={handleSignOut}>
          <button>
            <FontAwesomeIcon icon={faRightFromBracket} /> <span className='signout'>Sign Out</span>
          </button>
        </div>
      </div>

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
              <input className="input1" type="text" placeholder="Task name" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
              <textarea className="input2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
            </div>
            <div className="due-prior">
              <input className="duedate" placeholder="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <select className="priority" title="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
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
                  <input type="datetime-local" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} placeholder="Set reminder" />
                  <button onClick={(e) => { e.stopPropagation(); setReminderPopupVisible(false); }}>Save</button>
                </div>
              )}
            </div>

            <div className="form-buttons">
            <select className="filter-tasks" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option>Home</option>
              <option>Work</option>
              <option>Education</option>
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
        <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="taskList" direction='vertical'>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="task-list"
        >
          {visibleTasks.map((task, index) => {
              const taskId = task.id ?? `fallback-id-${task.taskName}`;

              return (
                <Draggable key={taskId} draggableId={taskId} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="task-item"
                    >
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
                )}
                </Draggable>
              );
            })}
            {provided.placeholder}
        </div>
      )}
        </Droppable>
        </DragDropContext>
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