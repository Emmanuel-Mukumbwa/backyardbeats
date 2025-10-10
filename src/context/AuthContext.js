import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const LOCAL_KEY = "bb_auth";

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);

	useEffect(() => {
		const stored = localStorage.getItem(LOCAL_KEY);
		if (stored) {
			setUser(JSON.parse(stored));
		}
	}, []);

	const login = (userData) => {
		setUser(userData);
		localStorage.setItem(LOCAL_KEY, JSON.stringify(userData));
	};

	const logout = () => {
		setUser(null);
		localStorage.removeItem(LOCAL_KEY);
	};

	return (
		<AuthContext.Provider value={{ user, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};
