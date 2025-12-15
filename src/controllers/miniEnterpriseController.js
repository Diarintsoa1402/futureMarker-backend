/* FICHIER: src/controllers/miniEnterpriseController.js */
const MiniEnterprise = require("../models/MiniEnterprise");
const { validationResult } = require("express-validator");

/**
 * Système de niveaux et récompenses pour gamification
 */
const calculateLevel = (xp) => Math.floor(xp / 100) + 1;

const checkAchievements = (enterprise) => {
  const achievements = [];
  const { products, finances } = enterprise;
  
  // Premier produit
  if (products.length >= 1 && !enterprise.achievements?.includes('first_product')) {
    achievements.push({
      id: 'first_product',
      name: '🎉 Premier Produit',
      description: 'Tu as créé ton premier produit !',
      xp: 50
    });
  }
  
  // Première vente
  if (finances.revenue > 0 && !enterprise.achievements?.includes('first_sale')) {
    achievements.push({
      id: 'first_sale',
      name: '💰 Première Vente',
      description: 'Tu as fait ta première vente !',
      xp: 100
    });
  }
  
  // Profit positif
  const profit = finances.revenue - finances.expenses;
  if (profit > 0 && !enterprise.achievements?.includes('first_profit')) {
    achievements.push({
      id: 'first_profit',
      name: '🌟 Première Réussite',
      description: 'Tu as fait du bénéfice !',
      xp: 150
    });
  }
  
  // 5 produits
  if (products.length >= 5 && !enterprise.achievements?.includes('five_products')) {
    achievements.push({
      id: 'five_products',
      name: '🚀 Catalogue Complet',
      description: 'Tu as 5 produits ou plus !',
      xp: 200
    });
  }
  
  return achievements;
};

/**
 * Récupérer la mini-entreprise de l'enfant
 */
exports.getEnterprise = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Tu dois être connecté pour voir ton entreprise 😊"
      });
    }

    const enterprise = await MiniEnterprise.findOne({ 
      where: { userId }
    });
    
    if (!enterprise) {
      return res.status(404).json({ 
        success: false,
        message: "Tu n'as pas encore créé ton entreprise" 
      });
    }

    // Ajouter des conseils pédagogiques
    const profit = enterprise.finances.revenue - enterprise.finances.expenses;
    const tips = [];
    
    if (enterprise.products.length === 0) {
      tips.push("💡 Commence par ajouter ton premier produit !");
    }
    
    if (profit < 0) {
      tips.push("📊 Attention : tes dépenses sont plus élevées que tes revenus. Essaie d'augmenter tes prix ou de réduire tes coûts !");
    } else if (profit > 0) {
      tips.push("🎉 Super ! Tu fais du bénéfice ! Continue comme ça !");
    }
    
    if (enterprise.products.some(p => p.stock === 0)) {
      tips.push("⚠️ Certains produits sont en rupture de stock !");
    }

    res.json({ 
      success: true,
      data: enterprise,
      tips,
      level: calculateLevel(enterprise.xp || 0)
    });
  } catch (err) {
    console.error("Erreur getEnterprise:", err);
    res.status(500).json({ 
      success: false,
      message: "Oups ! Une erreur s'est produite",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Créer ou mettre à jour la mini-entreprise
 */
exports.upsertEnterprise = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: "Vérifie bien tes informations 😊",
        errors: errors.array() 
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Tu dois être connecté 🔐"
      });
    }

    const { products = [], finances = {} } = req.body;

    // Validation pédagogique - messages adaptés aux enfants
    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: "Le format des produits n'est pas bon 🤔"
      });
    }

    for (const product of products) {
      if (!product.name || typeof product.name !== 'string' || !product.name.trim()) {
        return res.status(400).json({
          success: false,
          message: "N'oublie pas de donner un nom à tous tes produits ! 📝"
        });
      }
      
      if (typeof product.price !== 'number' || product.price < 0) {
        return res.status(400).json({
          success: false,
          message: `Le prix de "${product.name}" doit être un nombre positif 💰`
        });
      }
      
      if (typeof product.stock !== 'number' || product.stock < 0 || !Number.isInteger(product.stock)) {
        return res.status(400).json({
          success: false,
          message: `Le stock de "${product.name}" doit être un nombre entier positif 📦`
        });
      }
    }

    const validatedFinances = {
      capital: Math.max(0, parseFloat(finances.capital) || 0),
      revenue: Math.max(0, parseFloat(finances.revenue) || 0),
      expenses: Math.max(0, parseFloat(finances.expenses) || 0)
    };

    let enterprise = await MiniEnterprise.findOne({ where: { userId } });
    let isNewEnterprise = false;
    let newAchievements = [];

    if (!enterprise) {
      isNewEnterprise = true;
      enterprise = await MiniEnterprise.create({ 
        userId, 
        products,
        finances: validatedFinances,
        xp: 0,
        achievements: []
      });
    } else {
      // Vérifier les nouveaux succès
      const tempEnterprise = {
        ...enterprise.toJSON(),
        products,
        finances: validatedFinances
      };
      
      newAchievements = checkAchievements(tempEnterprise);
      
      // Ajouter l'XP des nouveaux succès
      let xpGain = 10; // XP de base pour la sauvegarde
      const currentAchievements = enterprise.achievements || [];
      
      newAchievements.forEach(achievement => {
        if (!currentAchievements.includes(achievement.id)) {
          xpGain += achievement.xp;
          currentAchievements.push(achievement.id);
        }
      });
      
      enterprise.products = products;
      enterprise.finances = validatedFinances;
      enterprise.xp = (enterprise.xp || 0) + xpGain;
      enterprise.achievements = currentAchievements;
      await enterprise.save();
    }

    // Message de félicitations
    let message = "Super ! Tout est sauvegardé ! ✨";
    if (isNewEnterprise) {
      message = "🎉 Bienvenue dans le monde de l'entrepreneuriat ! Ta mini-entreprise est créée !";
    } else if (newAchievements.length > 0) {
      message = `🏆 Bravo ! Tu as débloqué ${newAchievements.length} nouveau(x) succès !`;
    }

    res.json({ 
      success: true,
      message,
      data: enterprise,
      newAchievements: newAchievements.map(a => ({ name: a.name, description: a.description })),
      level: calculateLevel(enterprise.xp || 0)
    });
  } catch (err) {
    console.error("Erreur upsertEnterprise:", err);
    res.status(500).json({ 
      success: false,
      message: "Oups ! Impossible de sauvegarder 😔",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Obtenir des conseils pédagogiques personnalisés
 */
exports.getTips = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Tu dois être connecté" 
      });
    }

    const enterprise = await MiniEnterprise.findOne({ where: { userId } });
    
    if (!enterprise) {
      return res.status(404).json({ 
        success: false,
        message: "Entreprise non trouvée" 
      });
    }

    const tips = [];
    const { products, finances } = enterprise;
    const profit = finances.revenue - finances.expenses;
    const avgPrice = products.length > 0 
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length 
      : 0;

    // Conseils basés sur l'analyse
    if (products.length === 0) {
      tips.push({
        type: "info",
        title: "Commence ton aventure !",
        message: "Ajoute ton premier produit pour commencer à vendre ! Pense à quelque chose que tu aimes créer. 🎨"
      });
    }

    if (products.length > 0 && finances.revenue === 0) {
      tips.push({
        type: "tip",
        title: "Prêt à vendre ?",
        message: "Tu as des produits ! Maintenant, essaie de faire ta première vente. N'oublie pas de noter le montant dans 'Revenus'. 💰"
      });
    }

    if (profit < 0 && finances.revenue > 0) {
      tips.push({
        type: "warning",
        title: "Attention aux dépenses !",
        message: `Tu dépenses plus que tu ne gagnes (${Math.abs(profit).toFixed(2)}€ de perte). Essaie d'augmenter tes prix ou de fabriquer à moindre coût ! 📊`
      });
    }

    if (profit > 0) {
      tips.push({
        type: "success",
        title: "Bravo entrepreneur !",
        message: `Tu as fait ${profit.toFixed(2)}€ de bénéfice ! Continue comme ça ! 🌟`
      });
    }

    if (avgPrice < 1 && products.length > 0) {
      tips.push({
        type: "tip",
        title: "Valorise ton travail !",
        message: "Tes prix sont peut-être trop bas. N'oublie pas de compter le temps et les matériaux utilisés ! ⏰"
      });
    }

    if (products.some(p => p.stock === 0)) {
      tips.push({
        type: "info",
        title: "Stock vide !",
        message: "Certains de tes produits sont en rupture de stock. Pense à en fabriquer plus ! 📦"
      });
    }

    res.json({ 
      success: true,
      tips,
      analysis: {
        totalProducts: products.length,
        profit,
        profitStatus: profit > 0 ? "positive" : profit < 0 ? "negative" : "neutral"
      }
    });
  } catch (err) {
    console.error("Erreur getTips:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des conseils"
    });
  }
};

/**
 * Enregistrer une vente
 */
exports.recordSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: "Vérifie bien les informations de ta vente 😊",
        errors: errors.array() 
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Tu dois être connecté 🔐"
      });
    }

    const { productId, quantity } = req.body;

    const enterprise = await MiniEnterprise.findOne({ where: { userId } });
    
    if (!enterprise) {
      return res.status(404).json({ 
        success: false,
        message: "Mini-entreprise non trouvée" 
      });
    }

    // Trouver le produit
    const productIndex = enterprise.products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Ce produit n'existe pas ! 🤔"
      });
    }

    const product = enterprise.products[productIndex];

    // Vérifications
    if (!product.name || !product.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Donne d'abord un nom à ce produit ! 📝"
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "La quantité doit être supérieure à 0 ! 📦"
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Tu n'as que ${product.stock} en stock ! 📦`
      });
    }

    // Calculer le montant de la vente
    const saleAmount = product.price * quantity;

    // Créer l'enregistrement de vente
    const sale = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      emoji: product.emoji || "📦",
      quantity,
      unitPrice: product.price,
      totalAmount: saleAmount,
      date: new Date().toISOString()
    };

    // Mettre à jour le stock et les ventes
    enterprise.products[productIndex] = {
      ...product,
      stock: product.stock - quantity,
      totalSold: (product.totalSold || 0) + quantity
    };

    // Mettre à jour les finances
    enterprise.finances.revenue += saleAmount;

    // Ajouter à l'historique
    const salesHistory = enterprise.salesHistory || [];
    salesHistory.push(sale);
    enterprise.salesHistory = salesHistory;

    // Ajouter de l'XP
    const xpGain = quantity * 5; // 5 XP par produit vendu
    enterprise.xp = (enterprise.xp || 0) + xpGain;

    // Vérifier les succès
    const newAchievements = checkAchievements(enterprise);
    const currentAchievements = enterprise.achievements || [];
    
    newAchievements.forEach(achievement => {
      if (!currentAchievements.includes(achievement.id)) {
        enterprise.xp += achievement.xp;
        currentAchievements.push(achievement.id);
      }
    });
    
    enterprise.achievements = currentAchievements;

    await enterprise.save();

    res.json({ 
      success: true,
      message: `🎉 Super ! Tu as vendu ${quantity} ${product.name} et gagné ${saleAmount.toFixed(2)}€ !`,
      data: {
        sale,
        newStock: enterprise.products[productIndex].stock,
        totalRevenue: enterprise.finances.revenue,
        xpGained: xpGain,
        newAchievements: newAchievements.map(a => ({ name: a.name, description: a.description }))
      },
      level: calculateLevel(enterprise.xp)
    });
  } catch (err) {
    console.error("Erreur recordSale:", err);
    res.status(500).json({ 
      success: false,
      message: "Oups ! Impossible d'enregistrer la vente 😔",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Obtenir l'historique des ventes
 */
exports.getSalesHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Tu dois être connecté"
      });
    }

    const enterprise = await MiniEnterprise.findOne({ where: { userId } });
    
    if (!enterprise) {
      return res.status(404).json({ 
        success: false,
        message: "Mini-entreprise non trouvée" 
      });
    }

    const salesHistory = enterprise.salesHistory || [];
    const totalSales = salesHistory.length;
    const totalItemsSold = salesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalRevenue = salesHistory.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Produit le plus vendu
    const productSales = {};
    salesHistory.forEach(sale => {
      if (!productSales[sale.productName]) {
        productSales[sale.productName] = {
          name: sale.productName,
          emoji: sale.emoji,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[sale.productName].quantity += sale.quantity;
      productSales[sale.productName].revenue += sale.totalAmount;
    });

    const bestSeller = Object.values(productSales).length > 0
      ? Object.values(productSales).reduce((best, current) => 
          current.quantity > best.quantity ? current : best
        )
      : null;

    res.json({ 
      success: true,
      data: {
        sales: salesHistory.reverse(), // Plus récentes en premier
        summary: {
          totalSales,
          totalItemsSold,
          totalRevenue,
          bestSeller
        }
      }
    });
  } catch (err) {
    console.error("Erreur getSalesHistory:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération de l'historique"
    });
  }
};

/**
 * Obtenir les statistiques (version enfant)
 */
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentification requise" 
      });
    }

    const enterprise = await MiniEnterprise.findOne({ where: { userId } });
    
    if (!enterprise) {
      return res.status(404).json({ 
        success: false,
        message: "Mini-entreprise non trouvée" 
      });
    }

    const stats = {
      totalProducts: enterprise.products.length,
      totalStock: enterprise.products.reduce((sum, p) => sum + p.stock, 0),
      totalStockValue: enterprise.products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      profit: enterprise.finances.revenue - enterprise.finances.expenses,
      level: calculateLevel(enterprise.xp || 0),
      xp: enterprise.xp || 0,
      achievementsUnlocked: enterprise.achievements?.length || 0,
      bestSellingProduct: enterprise.products.length > 0 
        ? enterprise.products.reduce((max, p) => p.price > max.price ? p : max, enterprise.products[0])
        : null
    };

    // Messages motivants
    let motivation = "Continue comme ça ! 💪";
    if (stats.profit > 10) {
      motivation = "Tu es un super entrepreneur ! 🌟";
    } else if (stats.profit > 0) {
      motivation = "Bon début ! Tu es sur la bonne voie ! 🚀";
    } else if (stats.profit < 0) {
      motivation = "N'abandonne pas ! Chaque entrepreneur fait des erreurs au début. 💡";
    }

    res.json({ 
      success: true,
      data: stats,
      motivation
    });
  } catch (err) {
    console.error("Erreur getStatistics:", err);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors du calcul des statistiques"
    });
  }
};