# import os
# from flask import Flask
# from flask_sqlalchemy import SQLAlchemy
# from flask_migrate import Migrate
# from flask_bcrypt import Bcrypt
# from flask_jwt_extended import JWTManager
# from flask_cors import CORS

# app = Flask(__name__)

# app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
#     "DATABASE_URL", "sqlite:///property_management.db"
# )
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-key-change-in-prod")
# app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

# db = SQLAlchemy(app)
# migrate = Migrate(app, db)
# bcrypt = Bcrypt(app)
# jwt = JWTManager(app)
# CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ✅ Fix DATABASE_URL for Render
uri = os.environ.get("DATABASE_URL")
if uri and uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = uri or "sqlite:///property_management.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "super-secret-key-change-in-prod")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ✅ Allow frontend access (fix later with real domain)


# CORS(app, resources={r"/api/*": {"origins": [
#     "http://localhost:5173",
#     "https://your-app.vercel.app"
# ]}})
CORS(app)