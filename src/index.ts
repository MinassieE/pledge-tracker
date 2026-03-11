import app from './app';
import dev from './config/default';

const PORT = dev.app.port;

app.listen(PORT, () => {
  console.log(`Server started 🚀 on port ${PORT}`);
});