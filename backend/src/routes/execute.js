/**
 * Execute Route
 * 
 * POST /api/execute — Dispatches C code to the isolated gdbRunner module
 * and returns the structured execution timeline.
 */

import { Router } from 'express';
import { runAndTrace } from '../services/gdbRunner.js';

export const executeRoute = Router();

executeRoute.post('/execute', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide C code to visualize.',
        errorType: 'validation'
      });
    }

    if (code.length > 25000) {
      return res.status(400).json({
        success: false,
        error: 'Code exceeds length limit (25,000 chars).',
        errorType: 'validation'
      });
    }

    // Call the isolated GDB runner module
    const result = await runAndTrace(code);

    return res.json(result);

  } catch (err) {
    console.error('[execute] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal execution server error',
      errorType: 'server'
    });
  }
});
