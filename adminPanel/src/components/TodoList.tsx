"use client";

import { useEffect, useReducer, useState } from "react";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2, Pencil } from "lucide-react";
import { format, isSameDay } from "date-fns";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type State = {
  todos: Todo[];
};

type Action =
  | { type: "ADD"; payload: Todo }
  | { type: "TOGGLE"; payload: string }
  | { type: "DELETE"; payload: string }
  | { type: "EDIT"; payload: { id: string; text: string } }
  | { type: "SET"; payload: Todo[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET":
      return { todos: action.payload };

    case "ADD":
      return { todos: [action.payload, ...state.todos] };

    case "TOGGLE":
      return {
        todos: state.todos.map((t) =>
          t.id === action.payload
            ? { ...t, completed: !t.completed }
            : t
        ),
      };

    case "DELETE":
      return {
        todos: state.todos.filter((t) => t.id !== action.payload),
      };

    case "EDIT":
      return {
        todos: state.todos.map((t) =>
          t.id === action.payload.id
            ? { ...t, text: action.payload.text }
            : t
        ),
      };

    default:
      return state;
  }
}

const TodoList = () => {
  const [state, dispatch] = useReducer(reducer, { todos: [] });

  const [input, setInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const [filter, setFilter] = useState<
    "all" | "active" | "completed"
  >("all");

  const [date, setDate] = useState<Date>(new Date());

  // Load
  useEffect(() => {
    const stored = localStorage.getItem("todos");
    if (stored) dispatch({ type: "SET", payload: JSON.parse(stored) });
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(state.todos));
  }, [state.todos]);

  // Add / Update
  const handleSubmit = () => {
    if (!input.trim()) return;

    if (editId) {
      dispatch({
        type: "EDIT",
        payload: { id: editId, text: input },
      });
      setEditId(null);
    } else {
      dispatch({
        type: "ADD",
        payload: {
          id: crypto.randomUUID(),
          text: input,
          completed: false,
          date: date.toISOString(),
        },
      });
    }

    setInput("");
  };

  const filtered = state.todos.filter((t) => {
    const matchDate = isSameDay(new Date(t.date), date);

    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
        ? !t.completed
        : t.completed;

    return matchDate && matchFilter;
  });

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Todo List</h1>

      {/* INPUT */}
      <div className="flex gap-2 mb-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a task..."
        />

        <Button onClick={handleSubmit}>
          {editId ? "Update" : "Add"}
        </Button>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 mb-3">
        {["all", "active", "completed"].map((f: any) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* STATS */}
      <div className="text-xs text-muted-foreground mb-3">
        Total: {state.todos.length} | Active:{" "}
        {state.todos.filter((t) => !t.completed).length} | Done:{" "}
        {state.todos.filter((t) => t.completed).length}
      </div>

      {/* LIST */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {filtered.map((todo) => (
            <Card key={todo.id} className="p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() =>
                    dispatch({
                      type: "TOGGLE",
                      payload: todo.id,
                    })
                  }
                />

                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      todo.completed
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {todo.text}
                  </p>

                  <span className="text-xs text-gray-400">
                    {format(new Date(todo.date), "PPP")}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setInput(todo.text);
                    setEditId(todo.id);
                  }}
                >
                  <Pencil className="w-4 h-4 text-blue-500" />
                </button>

                <button
                  onClick={() =>
                    dispatch({
                      type: "DELETE",
                      payload: todo.id,
                    })
                  }
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-6">
              No todos found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TodoList;