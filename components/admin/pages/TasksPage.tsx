import React, { useState } from 'react';
import {
  Plus,
  Clock,
  User,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  QrCode,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { EventQrModal } from '../components/common/EventQrModal';
import { Event, EventTask, TaskPriority, TaskStatus } from '../types';

interface TasksPageProps {
  navigate: (path: string) => void;
}

const COLUMNS: TaskStatus[] = ['Pending', 'In Progress', 'Review', 'Completed'];

export const TasksPage: React.FC<TasksPageProps> = ({ navigate }) => {
  const { tasks, events, teamMembers, createTask, updateTask, deleteTask, addToast } =
    useStudioData();
  const { isAdmin } = useAuth();

  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Drag-and-Drop Kanban state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // QR Modal state
  const [qrModalEvent, setQrModalEvent] = useState<Event | null>(null);

  // New task form state
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<TaskPriority>('Normal');
  const [description, setDescription] = useState('');

  const filteredTasks = tasks.filter((t) => {
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const evt = events.find((e) => e.id === t.eventId);
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const completedCount = filteredTasks.filter((t) => t.status === 'Completed').length;
  const progressPercent =
    filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventId) {
      addToast('Title and Event are required', 'error');
      return;
    }

    await createTask({
      eventId,
      title,
      assigneeId: assigneeId || undefined,
      dueDate,
      priority,
      description,
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing || existing.status === newStatus) return;
    await updateTask(taskId, { status: newStatus });
    addToast(`Moved "${existing.title}" to ${newStatus}.`);
  };

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: EventTask) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverColumn = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (droppedId) {
      await handleStatusChange(droppedId, targetStatus);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const getColumnAccent = (status: TaskStatus) => {
    if (status === 'Pending') return 'border-t-4 border-t-slate-400';
    if (status === 'In Progress') return 'border-t-4 border-t-amber-500';
    if (status === 'Review') return 'border-t-4 border-t-sky-500';
    return 'border-t-4 border-t-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Header & Progress Bar */}
      <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-primary">
              {isAdmin ? 'Post-Production Kanban Pipeline' : 'My Assigned Work (Kanban Board)'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {isAdmin
                ? 'Drag and drop tasks across stages or generate mobile QR assignment passes for the crew.'
                : 'Drag and drop your assigned tasks across columns to update your work progress visually.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-primary shadow-2xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent Only</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (events.length > 0 && !eventId) setEventId(events[0].id);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              <strong className="text-primary">{completedCount}</strong> of{' '}
              <strong className="text-primary">{filteredTasks.length}</strong> assigned tasks
              completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full sm:w-64 h-2 bg-background rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Drag-and-Drop Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((status, colIndex) => {
          const colTasks = filteredTasks.filter((t) => t.status === status);
          const isDropTarget = dragOverColumn === status;

          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOverColumn(e, status)}
              onDragEnter={(e) => handleDragOverColumn(e, status)}
              onDragLeave={() => {
                if (dragOverColumn === status) setDragOverColumn(null);
              }}
              onDrop={(e) => handleDropOnColumn(e, status)}
              className={`rounded-2xl p-4 space-y-3 min-h-[520px] border transition-all ${getColumnAccent(
                status
              )} ${
                isDropTarget
                  ? 'bg-accent/10 border-accent ring-2 ring-accent/40 scale-[1.01]'
                  : 'bg-surface/80 border-border'
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-2 border-b border-border">
                <span className="font-bold text-xs uppercase tracking-wider text-primary">
                  {status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-background text-primary border border-border">
                  {colTasks.length}
                </span>
              </div>

              {colTasks.length === 0 ? (
                <div className="h-40 rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-4 text-center text-xs text-text-muted">
                  <span>Drop task card here to move to</span>
                  <strong className="text-accent mt-0.5">{status}</strong>
                </div>
              ) : (
                <div className="space-y-3">
                  {colTasks.map((task) => {
                    const evt = events.find((e) => e.id === task.eventId);
                    const assignee = teamMembers.find((m) => m.id === task.assigneeId);
                    const isOverdue = task.status !== 'Completed' && task.dueDate < todayStr;
                    const isDragging = draggedTaskId === task.id;

                    const prevCol = colIndex > 0 ? COLUMNS[colIndex - 1] : null;
                    const nextCol = colIndex < COLUMNS.length - 1 ? COLUMNS[colIndex + 1] : null;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 bg-background rounded-xl border shadow-xs space-y-2.5 transition-all cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'opacity-40 scale-95 border-accent'
                            : isOverdue
                            ? 'border-rose-500/50 ring-1 ring-rose-500/20'
                            : 'border-border hover:border-accent/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <GripVertical className="w-4 h-4 text-text-muted shrink-0 mt-0.5 opacity-60" />
                            <span className="font-bold text-xs text-primary leading-snug">
                              {task.title}
                            </span>
                          </div>
                          <StatusBadge status={task.priority} size="sm" />
                        </div>

                        {evt &&
                          (isAdmin ? (
                            <div className="flex items-center justify-between gap-2">
                              <div
                                onClick={() => navigate(`/events/${evt.id}`)}
                                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer truncate"
                              >
                                {evt.title}
                              </div>
                              <button
                                type="button"
                                onClick={() => setQrModalEvent(evt)}
                                className="px-2 py-0.5 rounded bg-accent/15 hover:bg-accent/25 text-accent text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Scan Event & Task QR Pass"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>QR</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg bg-surface border border-border text-[10px] text-text-muted space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-primary truncate">{evt.title}</span>
                                <button
                                  type="button"
                                  onClick={() => setQrModalEvent(evt)}
                                  className="px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold inline-flex items-center gap-0.5 shrink-0 cursor-pointer"
                                  title="Mobile QR Pass"
                                >
                                  <QrCode className="w-2.5 h-2.5" />
                                  <span>QR</span>
                                </button>
                              </div>
                              <div>
                                Date: {formatDate(evt.eventDate)} · {evt.startTime || '18:00'}–
                                {evt.endTime || '23:00'}
                              </div>
                              <div className="truncate">
                                Location: {[evt.venue, evt.city].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          ))}

                        {task.description && (
                          <p className="text-[11px] text-text-muted line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] text-text-muted">
                          <span className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-accent shrink-0" />
                            <strong className="text-primary truncate">
                              {assignee?.name || 'Assigned Crew'}
                            </strong>
                          </span>
                          <span
                            className={`flex items-center gap-1 font-medium shrink-0 ${
                              isOverdue ? 'text-rose-500 font-bold' : ''
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        </div>

                        {/* Quick Step Controls + Dropdown + Admin Delete */}
                        <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-border">
                          <div className="flex items-center gap-1">
                            {prevCol && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task.id, prevCol)}
                                className="p-1 rounded-md bg-surface border border-border hover:border-accent text-text-muted hover:text-primary cursor-pointer"
                                title={`Move back to ${prevCol}`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(task.id, e.target.value as TaskStatus)
                              }
                              className="px-2 py-1 bg-surface border border-border rounded-md text-[10px] font-semibold text-primary cursor-pointer"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">Review</option>
                              <option value="Completed">Completed</option>
                            </select>
                            {nextCol && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task.id, nextCol)}
                                className="p-1 rounded-md bg-surface border border-border hover:border-accent text-text-muted hover:text-primary cursor-pointer"
                                title={`Advance to ${nextCol}`}
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-text-muted hover:text-rose-500 rounded cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE TASK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Post-Production Task"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Event *
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            >
              <option value="">-- Choose Event --</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({formatDate(ev.eventDate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 4K Drone Color Grading & Teaser Cut"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description / Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Mobile QR Assignment Pass Modal */}
      <EventQrModal
        isOpen={Boolean(qrModalEvent)}
        onClose={() => setQrModalEvent(null)}
        event={qrModalEvent}
        tasks={tasks}
        teamMembers={teamMembers}
      />
    </div>
  );
};
