import express from "express";
import { engine } from "express-handlebars";
import { Server } from "socket.io";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import productsRouter from "./routes/products.routes.js";
import cartsRouter from "./routes/carts.router.js";
import viewsRouter from "./routes/views.router.js";
import CartManager from "./managers/cart-manager.js";
import ProductManager from "./managers/product-manager.js";
import session from "express-session";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import sessionsRouter from "./routes/api/sessions.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8080;
const cartManager = new CartManager(path.join(__dirname, "data", "carts.json"));
const productManager = new ProductManager(path.join(__dirname, "data", "productos.json"));

app.use(session({
    secret: process.env.JWT_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(passport.initialize());

// Configuración de Handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Rutas
app.use("/api/products", productsRouter);
app.use("/api/carts", cartsRouter);
app.use("/", viewsRouter);
app.use("/api/sessions", sessionsRouter);

const initialProducts = [
    { title: "Fideos", description: "Marolio", code: "abc444", price: 1.5, img: "sin imagen", stock: 85 },
    { title: "Pure de Tomate", description: "Arcor", code: "pmr333", price: 800, img: "sin imagen", stock: 50 },
];

app.get("/products", (req, res) => {
    res.render("home", { layout: "main", productos: initialProducts });
});

app.post("/api/carts", async (req, res) => {
    try {
        const newCart = await cartManager.crearCarrito();
        req.session.cartId = newCart.id;
        res.status(201).json({ cartId: newCart.id });
    } catch (error) {
        res.status(500).json({ message: "Error al crear el carrito", error: error.message });
    }
});

const httpServer = app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

const io = new Server(httpServer);

const updateProducts = async () => {
    const productos = await productManager.getProducts();
    io.emit("productos", productos);
};

io.on("connection", async (socket) => {
    console.log("Un cliente se conectó");
    socket.emit("productos", await productManager.getProducts());

    socket.on("addProduct", async (newProduct) => {
        await productManager.addProduct(newProduct);
        await updateProducts();
    });

    socket.on("deleteProduct", async (id) => {
        await productManager.deleteProduct(id);
        await updateProducts();
    });
});

app.post("/api/products", async (req, res) => {
    try {
        const newProduct = req.body;
        if (!newProduct.title || !newProduct.price || newProduct.stock == null) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        await productManager.addProduct(newProduct);
        await updateProducts();
        res.status(201).json({ message: "Producto agregado exitosamente" });
    } catch (error) {
        console.error("Error al agregar producto:", error);
        res.status(500).json({ error: "Error al agregar el producto", details: error.message });
    }
});

app.put("/api/products/:id", async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updatedData = req.body;

        if (!updatedData.title || !updatedData.price || updatedData.stock == null) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        await productManager.updateProduct(productId, updatedData);
        await updateProducts();
        res.status(200).json({ message: "Producto actualizado exitosamente" });
    } catch (error) {
        console.error("Error al actualizar producto:", error);
        res.status(500).json({ error: "Error al actualizar el producto", details: error.message });
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        await productManager.deleteProduct(productId);
        await updateProducts();
        res.status(200).json({ message: "Producto eliminado exitosamente" });
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        res.status(500).json({ error: "Error al eliminar el producto", details: error.message });
    }
});
