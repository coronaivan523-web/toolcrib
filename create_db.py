import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

# Forzar utf-8 en la salida para evitar errores de impresión en la consola de windows si hay caracteres raros
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def create_database():
    try:
        # Conectar a la base de datos 'postgres' por defecto para crear la nueva
        conn = psycopg2.connect(
            user='postgres', 
            password='Wasion2020', 
            host='127.0.0.1',
            port=5433,
            dbname='postgres'
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Verificar si existe
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'Toolcrib'")
        exists = cur.fetchone()
        
        if not exists:
            print("Creando base de datos Toolcrib...")
            cur.execute('CREATE DATABASE Toolcrib')
            print("Base de datos creada exitosamente.")
        else:
            print("La base de datos Toolcrib ya existe.")
            
        cur.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"Error operacional de conexión: {e}")
        # Intentar decodificar el error si viene en bytes raros
        try:
            print(f"Detalles: {e.pgcode} - {e.pgerror}")
        except:
            pass
        return False
    except Exception as e:
        # Imprimir la representación del objeto error para evitar intentar decodificar el mensaje string si falla
        print(f"Error general (repr): {repr(e)}")
        try:
            # Intentar imprimir el mensaje forzando codificación si es posible, o ignorando errores
            print(f"Error message: {str(e).encode('utf-8', errors='replace').decode('utf-8')}")
        except:
            pass
        return False

if __name__ == "__main__":
    create_database()
