"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const browser = () => true;
const server = () => false;
export function useHydrated() { return useSyncExternalStore(subscribe, browser, server); }
