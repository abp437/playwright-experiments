export const ENV: string = "local";

export const isQaEnv = () => ENV === "qa";
export const isLocalEnv = () => ENV === "local";
export const BASE_URL: string = isQaEnv()
  ? "http://attendance-dev-647932856848-ap-south-1-an.s3-website.ap-south-1.amazonaws.com"
  : "http://localhost:5173";
