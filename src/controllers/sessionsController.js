import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const SECRET = process.env.JWT_SECRET || "fallback-secret";

export const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, email, age, password } = req.body;
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = await User.create({ first_name, last_name, email, age, password: hashedPassword });

        res.status(201).json({ message: "Usuario registrado con éxito", userId: newUser._id });
    } catch (error) {
        res.status(500).json({ error: "Error en el registro", details: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "1h" });
        res.cookie("token", token, { httpOnly: true });

        res.json({ message: "Login exitoso", token });
    } catch (error) {
        res.status(500).json({ error: "Error en el login", details: error.message });
    }
};

export const getCurrentUser = (req, res) => {
    res.json({ user: req.user });
};
