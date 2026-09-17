import { useAppSelector } from "../store/hooks";
import { lightTheme, darkTheme } from "../theme/colors";

export const useTheme = () => {
  const theme = useAppSelector((state) => state.auth.theme);
  
  if (theme === "Light") {
    return {
        colors: lightTheme,
        isDark: false,
        theme: "Light" as const
    };
  }
  
  return {
      colors: darkTheme,
      isDark: true,
      theme: "Dark" as const
  };
};
