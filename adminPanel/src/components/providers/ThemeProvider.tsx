"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Providers } from "./Provider"
import AuthSync from "../AuthSync";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}  scriptProps={{ "data-cfasync": "false" }} >
    <Providers>
      
        <AuthSync />

     
      {children}
    </Providers>
  </NextThemesProvider>
}
