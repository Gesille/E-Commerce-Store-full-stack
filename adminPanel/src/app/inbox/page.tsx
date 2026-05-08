// app/inbox/page.tsx
"use client";

import { useState } from "react";
import { Trash2, MailOpen, Mail } from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import { useGetAllMessagesQuery, useMarkAsReadMutation, useDeleteMessageMutation } from "@/redux/contact/contactApi";

export default function InboxPage() {
  const { data, isLoading, refetch } = useGetAllMessagesQuery({});
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [selected, setSelected] = useState<any>(null);

  const handleRead = async (id: string) => {
    await markAsRead(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await deleteMessage(id);
    setSelected(null);
    refetch();
  };

  if (isLoading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        {data?.unreadCount > 0 && (
          <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
            {data.unreadCount} unread
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        {/* MESSAGE LIST */}
        <div className="flex flex-col gap-2">
          {data?.messages?.length === 0 && (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          )}

          {data?.messages?.map((msg: any) => (
            <div
              key={msg._id}
              onClick={() => {
                setSelected(msg);
                if (!msg.isRead) handleRead(msg._id);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition hover:border-primary
                ${selected?._id === msg._id ? "border-primary bg-muted" : ""}
                ${!msg.isRead ? "bg-blue-50 dark:bg-blue-950 border-blue-200" : "bg-background"}
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!msg.isRead
                    ? <Mail size={14} className="text-blue-500 shrink-0" />
                    : <MailOpen size={14} className="text-muted-foreground shrink-0" />
                  }
                  <div>
                    <p className="font-semibold text-sm">{msg.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {msg.message}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* MESSAGE DETAIL */}
        {selected ? (
          <div className="bg-background border rounded-2xl p-6 flex flex-col gap-4">

            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-lg">{selected.name}</p>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                {selected.phone && (
                  <p className="text-sm text-muted-foreground">{selected.phone}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(selected._id)}
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm leading-relaxed">{selected.message}</p>
            </div>

            <p className="text-xs text-muted-foreground mt-auto">
              {formatDistanceToNow(new Date(selected.createdAt), { addSuffix: true })}
            </p>

            {/* reply via email */}
            <a
              href={`mailto:${selected.email}`}
              className="w-full text-center py-2 rounded-xl border hover:bg-muted transition text-sm"
            >
              Reply via Email
            </a>

          </div>
        ) : (
          <div className="border rounded-2xl p-6 flex items-center justify-center text-muted-foreground text-sm">
            Select a message to read
          </div>
        )}

      </div>
    </div>
  );
}