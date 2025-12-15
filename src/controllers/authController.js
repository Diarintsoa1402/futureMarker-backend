const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();
const User = require("../models/User");
const oauthConfig = require("../config/oauth");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");
const SALT_ROUNDS = 10;

// Vérification reCAPTCHA
const verifyRecaptcha = async (token) => {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: oauthConfig.recaptcha.secretKey,
          response: token
        }
      }
    );
    return response.data.success;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
};

// Générer JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Register
// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, recaptchaToken, parentEmail } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // Vérifier reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token missing" });
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({ message: "reCAPTCHA verification failed" });
    }

    // Vérifier si l'utilisateur existe déjà
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already used" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // 🟢 SI C’EST UN ENFANT, IL DOIT ÊTRE VALIDÉ PAR SON PARENT
    if (role === "child") {
      if (!parentEmail) {
        return res.status(400).json({ message: "Parent email required for child registration" });
      }

      const user = await User.create({
        name,
        email,
        password: hashed,
        role,
        provider: "local",
        parentEmail,
        isVerified: false,
      });

      // 📨 Envoi d’un email de validation au parent
      const token = jwt.sign({ childId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      const link = `${process.env.FRONTEND_ORIGIN}/verify-child/${token}`;

      await sendEmail(
        parentEmail,
        "Validation du compte de votre enfant",
        `
        <p>Bonjour,</p>
        <p>Votre enfant <b>${name}</b> souhaite créer un compte sur FutureMakers Hub.</p>
        <p>Pour confirmer son inscription, cliquez sur le lien suivant :</p>
        <a href="${link}">${link}</a>
        <p>Ce lien expirera dans 7 jours.</p>
        `
      );

      return res.status(200).json({
        message: "Un email de validation a été envoyé au parent.",
      });
    }

    // 🟢 Autres rôles: exigent vérification d'email
    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      provider: "local",
      isVerified: false,
    });

    const emailToken = jwt.sign({ uid: user.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const verifyLink = `${process.env.BACKEND_ORIGIN || process.env.BACKEND_URL || "http://localhost:3000"}/api/auth/verify-email?token=${emailToken}`;

    await sendEmail(
      email,
      "Vérifiez votre adresse email",
      `
      <p>Bonjour ${name},</p>
      <p>Merci pour votre inscription sur FutureMakers Hub.</p>
      <p>Veuillez confirmer votre adresse email en cliquant sur le lien suivant :</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>Ce lien expirera dans 24 heures.</p>
      `
    );

    return res.status(201).json({ message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte." });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Login
exports.login = async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    // Vérifier reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token missing" });
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
      return res.status(400).json({ message: "reCAPTCHA verification failed" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ code: "email_not_verified", message: "Veuillez vérifier votre adresse email." });
    }

    const token = generateToken(user);

    return res.json({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        avatarUrl: user.avatarUrl || null
      },
      token
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Google OAuth callback
exports.googleCallback = (req, res) => {
  const token = generateToken(req.user);
  const user = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  };

  // Redirection vers le frontend avec le token
  res.redirect(
    `${process.env.FRONTEND_ORIGIN}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
  );
};

// Facebook OAuth callback
exports.facebookCallback = (req, res) => {
  const token = generateToken(req.user);
  const user = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  };

  res.redirect(
    `${process.env.FRONTEND_ORIGIN}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
  );
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ["password"] } });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ message: "Email already used" });
      user.email = email;
    }
    if (name) user.name = name;
    if (password) user.password = await bcrypt.hash(password, SALT_ROUNDS);

    await user.save();
    return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });  

    await user.destroy();
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
// veerifyChildAccount

exports.verifyChild = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const child = await User.findByPk(decoded.childId);

    if (!child) return res.status(404).json({ message: "Child not found" });
    child.isVerified = true;
    await child.save();

    res.send("Le compte de l'enfant a été validé avec succès !");
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired link" });
  }
};

// Vérification d'email pour comptes non-enfants
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.uid);
    if (!user) return res.status(404).send("User not found");

    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    const redirect = `${process.env.FRONTEND_ORIGIN}/login?verified=1`;
    return res.redirect(302, redirect);
  } catch (err) {
    console.error(err);
    return res.status(400).send("Invalid or expired verification link");
  }
};

// Renvoyer l'email de vérification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Déjà vérifié" });

    const emailToken = jwt.sign({ uid: user.id }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const verifyLink = `${process.env.BACKEND_ORIGIN || process.env.BACKEND_URL }/api/auth/verify-email?token=${emailToken}`;

    await sendEmail(
      user.email,
      "Vérifiez votre adresse email",
      `
      <p>Bonjour ${user.name},</p>
      <p>Veuillez confirmer votre adresse email en cliquant sur le lien suivant :</p>
      <a href="${verifyLink}">${verifyLink}</a>
      `
    );

    return res.json({ message: "Email de vérification renvoyé." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};





// 🔹 Étape 1 : Demande de réinitialisation
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Sauvegarder le hash temporairement
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Lien de réinitialisation
    const link = `${process.env.FRONTEND_ORIGIN}/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "Réinitialisation de votre mot de passe",
      `
      <p>Bonjour ${user.name},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour en créer un nouveau (valide 10 minutes) :</p>
      <a href="${link}">${link}</a>
      `
    );

    res.json({ message: "Un email de réinitialisation a été envoyé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🔹 Étape 2 : Réinitialiser le mot de passe
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { [require("sequelize").Op.gt]: Date.now() },
      },
    });

    if (!user) return res.status(400).json({ message: "Lien invalide ou expiré." });

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
