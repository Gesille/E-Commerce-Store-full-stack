import dotenv from "dotenv";
dotenv.config();
import { Response } from "express";
import { IUser } from "../models/user.model.js";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean;
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_SECRET_EXPIRE || '300', 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200', 10);

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  
  sameSite: "none",  // ✅ works on IP over HTTP
  secure: true,    // ✅ false for HTTP
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none",  // ✅ same
  secure: true,
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  // ✅ both tokens in cookies like before
  res.cookie("ACCESS_TOKEN_SECRET", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};