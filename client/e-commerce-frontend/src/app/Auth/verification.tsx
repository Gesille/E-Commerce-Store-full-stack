/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { FC, useRef, useState, useEffect } from "react";
import { useActivateUserMutation } from "@/redux/auth/authApi";
import AuthLayout from "@/src/components/auth/AuthLayout";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { ShieldCheck, ArrowRight } from "lucide-react";

type Props = {
  setRoute: (route: string) => void;
};

type VerifyNumber = {
  0: string;
  1: string;
  2: string;
  3: string;
};

const Verification: FC<Props> = ({ setRoute }) => {
  const { token } = useSelector((state: any) => state.auth);
  const [activation, { isSuccess, error, isLoading }] =
    useActivateUserMutation();

  const [invalidError, setInvalidError] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [verifyNumber, setVerifyNumber] = useState<VerifyNumber>({
    0: "",
    1: "",
    2: "",
    3: "",
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Account activated successfully");
      setRoute("Login");
    }

    if (error) {
      if ("data" in error) {
        const err = error as any;
        toast.error(err.data.message);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInvalidError(true);
      }
    }
  }, [isSuccess, error, setRoute]);

  const verificationHandler = async () => {
    const code = Object.values(verifyNumber).join("");

    if (code.length !== 4) {
      setInvalidError(true);
      return;
    }

    await activation({
      activation_token: token,
      activation_code: code,
    });
  };

  const handleInputChange = (index: number, value: string) => {
    setInvalidError(false);

    const newState = { ...verifyNumber, [index]: value };
    setVerifyNumber(newState);

    if (value === "" && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (value.length === 1 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  return (
    <AuthLayout
      title="Verify Your Account"
      subtitle="Enter the 4-digit code sent to your email"
    >
      <div className="flex flex-col items-center space-y-6">
        {/* ICON */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center">
          <ShieldCheck className="text-white" size={28} />
        </div>

        {/* OTP INPUTS */}
        <div className="flex gap-4">
          {Object.keys(verifyNumber).map((key, index) => (
            <input
              key={key}
              ref={inputRefs[index]}
              type="text"
              maxLength={1}
              value={verifyNumber[key as unknown as keyof VerifyNumber]}
              onChange={(e) => handleInputChange(index, e.target.value)}
              className={`w-14 h-14 text-center text-lg font-semibold rounded-2xl border bg-gray-50 outline-none transition
                ${
                  invalidError
                    ? "border-red-500 shake"
                    : "border-gray-200 focus:border-violet-500"
                }`}
            />
          ))}
        </div>

        {/* ERROR TEXT */}
        {invalidError && (
          <p className="text-red-500 text-sm">Invalid verification code</p>
        )}

        {/* BUTTON */}
        <button
          onClick={verificationHandler}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          {isLoading ? "Verifying..." : "Verify Code"}
          <ArrowRight size={18} />
        </button>

        {/* FOOTER */}
        <p className="text-sm text-gray-500">
          Go back to{" "}
          <span
            onClick={() => setRoute("Login")}
            className="text-violet-500 cursor-pointer font-semibold"
          >
            Sign In
          </span>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Verification;
