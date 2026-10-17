import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import coilUiReducer from "./coilUiSlice";

export const store = configureStore({
  reducer: { auth: authReducer, coilUi: coilUiReducer },
});
