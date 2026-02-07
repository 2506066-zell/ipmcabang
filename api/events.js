const { query } = require('./_db');
const { cacheHeaders } = require('./_util');

module.exports = async (req, res) => {
  // SSE Setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Helper to send event
  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Initial Send
  send({ type: 'connected', ts: Date.now() });

  // Polling loop to check for schedule changes
  // In a real production app with Redis, we would subscribe to a channel.
  // Here we poll the DB every 10 seconds to see if the *next* schedule changed.
  
  let lastScheduleId = null;
  let lastScheduleTime = null;

  const checkSchedule = async () => {
    try {
      const nextSchedule = (await query`
        SELECT id, title, description, start_time 
        FROM quiz_schedules 
        WHERE active = true AND start_time > NOW() 
        ORDER BY start_time ASC 
        LIMIT 1
      `).rows[0];

      if (nextSchedule) {
        const timeStr = new Date(nextSchedule.start_time).toISOString();
        // If schedule changed or time changed
        if (nextSchedule.id !== lastScheduleId || timeStr !== lastScheduleTime) {
          lastScheduleId = nextSchedule.id;
          lastScheduleTime = timeStr;
          
          send({
            type: 'schedule_update',
            data: {
              title: nextSchedule.title,
              topic: nextSchedule.description || 'Event Mendatang',
              countdown_target: nextSchedule.start_time
            }
          });
        }
      } else {
        // No schedule
        if (lastScheduleId !== null) {
          lastScheduleId = null;
          lastScheduleTime = null;
          send({ type: 'schedule_update', data: null });
        }
      }
    } catch (e) {
      console.error('SSE Error:', e);
      // Don't crash the stream, just retry next time
    }
  };

  // Check immediately
  await checkSchedule();

  // Loop
  const interval = setInterval(checkSchedule, 10000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });

  // Auto-close after 25s to prevent Vercel Function Timeout errors
  // This forces client to reconnect and frees up the lambda slot
  setTimeout(() => {
    clearInterval(interval);
    res.end();
  }, 25000);
};
