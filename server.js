const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// LOGIN - CORRIGIDO
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Tentativa login:', username);
  // Aceita admin / delipack123
  if (username === 'admin' && password === 'delipack123') {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Usuario ou senha incorretos!' });
});

// LISTAR DENUNCIAS
app.get('/api/denuncias', async (req, res) => {
  const { data, error } = await supabase.from('denuncias').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json(error);
  res.json(data);
});

// VER UMA DENUNCIA
app.get('/api/denuncias/:id', async (req, res) => {
  const { data } = await supabase.from('denuncias').select('*').eq('id', req.params.id).single();
  res.json(data);
});

// CRIAR DENUNCIA
app.post('/api/denuncias', async (req, res) => {
  const { data, error } = await supabase.from('denuncias').insert([req.body]).select();
  if (error) return res.status(500).json(error);
  res.json(data);
});

// DELETAR
app.delete('/api/denuncias/:id', async (req, res) => {
  await supabase.from('denuncias').delete().eq('id', req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Rodando na porta ' + PORT));
