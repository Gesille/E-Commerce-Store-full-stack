"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useGetAllUsersQuery } from "@/redux/user/userApi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

import EditUser from "@/components/EditUser";
import AppLineChart from "@/components/AppLineChart";

const SingleUserPage = () => {
  const { id } = useParams();
  const { data: users, isLoading } = useGetAllUsersQuery();

  const user = users?.find((u) => u._id === id);

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center text-sm">
        Loading...
      </div>
    );

  if (!user)
    return (
      <div className="h-screen flex items-center justify-center text-sm">
        User not found
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-8">

      {/* 🔷 HERO PROFILE HEADER */}
      <div className="bg-white border rounded-2xl p-6 flex items-center justify-between shadow-sm">

        <div className="flex items-center gap-5">

          <Avatar className="size-16 ring-2 ring-slate-100">
            <AvatarImage src={user.avatar?.url || ""} />
            <AvatarFallback>
              {user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>

            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>

            <div className="flex gap-2 mt-2">
              <Badge className="capitalize">{user.role}</Badge>

              {user.isVerified ? (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button className="rounded-xl">Edit Profile</Button>
          </SheetTrigger>
          <EditUser user={user} />
        </Sheet>
      </div>

      {/* 🔷 MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

        {/* LEFT PANEL */}
        <div className="lg:col-span-4 space-y-6">

          {/* IDENTITY CARD */}
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-sm font-semibold mb-4">Identity</h2>

            <div className="space-y-3 text-sm">

              <div>
                <p className="text-muted-foreground text-xs">Full Name</p>
                <p className="font-medium">{user.name}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p>{user.email}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Role</p>
                <p className="capitalize">{user.role}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Joined</p>
                <p>
                  {user.createdAt
                    ? new Date(user.createdAt).toDateString()
                    : "—"}
                </p>
              </div>

            </div>
          </div>

          {/* STATUS CARD */}
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-sm font-semibold mb-4">Account Status</h2>

            <div className="flex justify-between text-sm">
              <span>Verification</span>
              <span
                className={
                  user.isVerified
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                }
              >
                {user.isVerified ? "Verified" : "Pending"}
              </span>
            </div>

            <Progress value={user.isVerified ? 100 : 35} className="mt-3" />

            <p className="text-xs text-muted-foreground mt-3">
              Account trust level based on verification
            </p>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-8 space-y-6">

          {/* ACTIVITY HEADER */}
          <div className="bg-white border rounded-2xl p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold">
                Activity Overview
              </h2>
              <p className="text-xs text-muted-foreground">
                Real backend user behavior analytics
              </p>
            </div>

            <AppLineChart />
          </div>

        </div>
      </div>
    </div>
  );
};

export default SingleUserPage;