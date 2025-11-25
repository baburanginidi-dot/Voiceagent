import express, { Request, Response } from 'express';
import { query } from './db';

const router = express.Router();

// Get Config (Stages/Prompts)
router.get('/config', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_config');
    // Transform array to object map if needed, or return list
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update Config
router.post('/config', async (req: Request, res: Response) => {
  const { key, value } = req.body;
  try {
    const result = await query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, value]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Get Call Logs
router.get('/calls', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM calls ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get Single Call Log
router.get('/calls/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM calls WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

export default router;
