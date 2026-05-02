import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Rutas para servir archivos HTML
@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

# Configuración de Base de Datos
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///chubb.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

db = SQLAlchemy(app)

# Modelos
class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Poliza(db.Model):
    __tablename__ = 'polizas'
    id = db.Column(db.Integer, primary_key=True)
    no_poliza = db.Column(db.String(50), nullable=False)
    aseguradora = db.Column(db.String(100))
    tipo_seguro = db.Column(db.String(100))
    plan = db.Column(db.String(100))
    no_asesor = db.Column(db.String(50))
    estatus_poliza = db.Column(db.String(50))
    moneda = db.Column(db.String(20))
    suma_asegurada = db.Column(db.Float)
    fecha_emision = db.Column(db.String(20))
    inicio_poliza = db.Column(db.String(20))
    fin_poliza = db.Column(db.String(20))
    cobertura = db.Column(db.String(100))
    tipo_pago = db.Column(db.String(50))
    modo_cobro = db.Column(db.String(50))
    medio_cobro = db.Column(db.String(50))
    no_token = db.Column(db.String(100))
    prima_neta = db.Column(db.Float)
    prima_anual = db.Column(db.Float)
    prima_en_pesos = db.Column(db.Float)
    prima_en_dolares = db.Column(db.Float)
    prima_en_udis = db.Column(db.Float)
    nombre_contratante = db.Column(db.String(200))
    direccion_contratante = db.Column(db.String(500))
    telefono_contratante = db.Column(db.String(50))
    correo_contratante = db.Column(db.String(120))
    nombre_titular = db.Column(db.String(200))
    fecha_nac_titular = db.Column(db.String(20))
    asegurados_adicionales = db.Column(db.JSON)
    creado_en = db.Column(db.DateTime, default=datetime.utcnow)
    creado_por = db.Column(db.String(120))

class Historial(db.Model):
    __tablename__ = 'historial'
    id = db.Column(db.Integer, primary_key=True)
    accion = db.Column(db.String(50))
    detalle = db.Column(db.String(500))
    usuario = db.Column(db.String(120))
    fecha = db.Column(db.DateTime, default=datetime.utcnow)

# Crear tablas
with app.app_context():
    db.create_all()
    # Crear admin por defecto si no existe
    if not Usuario.query.filter_by(email='admin@chubb.com').first():
        admin = Usuario(nombre='Administrador', email='admin@chubb.com')
        admin.set_password('123456')
        db.session.add(admin)
        db.session.commit()

# --- Rutas API ---

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = Usuario.query.filter_by(email=email).first()
    if user and user.check_password(password):
        return jsonify({
            'success': True,
            'user': {
                'nombre': user.nombre,
                'email': user.email
            }
        })
    return jsonify({'success': False, 'message': 'Credenciales incorrectas'}), 401

def serialize_poliza(p):
    return {
        'id': str(p.id),
        'noPoliza': p.no_poliza,
        'aseguradora': p.aseguradora,
        'tipoSeguro': p.tipo_seguro,
        'plan': p.plan,
        'noAsesor': p.no_asesor,
        'estatusPoliza': p.estatus_poliza,
        'moneda': p.moneda,
        'sumaAsegurada': p.suma_asegurada,
        'fechaEmision': p.fecha_emision,
        'inicioPoliza': p.inicio_poliza,
        'fin_poliza': p.fin_poliza,
        'cobertura': p.cobertura,
        'tipoPago': p.tipo_pago,
        'modoCobro': p.modo_cobro,
        'medioCobro': p.medio_cobro,
        'noToken': p.no_token,
        'primaNeta': p.prima_neta,
        'primaAnual': p.prima_anual,
        'primaEnPesos': p.prima_en_pesos,
        'primaEnDolares': p.prima_en_dolares,
        'primaEnUdis': p.prima_en_udis,
        'nombreContratante': p.nombre_contratante,
        'direccionContratante': p.direccion_contratante,
        'telefonoContratante': p.telefono_contratante,
        'correoContratante': p.correo_contratante,
        'nombreTitular': p.nombre_titular,
        'fechaNacTitular': p.fecha_nac_titular,
        'aseguradosAdicionales': p.asegurados_adicionales,
        'creadoPor': p.creado_por
    }

@app.route('/api/polizas', methods=['GET'])
def get_polizas():
    polizas = Poliza.query.order_by(Poliza.creado_en.desc()).all()
    return jsonify([serialize_poliza(p) for p in polizas])

@app.route('/api/polizas/<id>', methods=['GET'])
def get_poliza(id):
    p = Poliza.query.get(id)
    if not p:
        return jsonify({'message': 'No encontrado'}), 404
    return jsonify(serialize_poliza(p))

@app.route('/api/polizas', methods=['POST'])
def add_poliza():
    data = request.json
    user_email = data.pop('userEmail', 'unknown')
    # Mapeo de campos CamelCase a snake_case si es necesario
    # (El frontend envía los campos tal cual los definimos en el HTML)
    
    # Normalización de nombres de campos (frontend usa camelCase en algunos o nombres de IDs)
    # Para simplicidad, asumo que el frontend enviará los nombres que coincidan con el modelo
    # o los mapeamos manualmente.
    
    new_p = Poliza(
        no_poliza=data.get('noPoliza'),
        aseguradora=data.get('aseguradora'),
        tipo_seguro=data.get('tipoSeguro'),
        plan=data.get('plan'),
        no_asesor=data.get('noAsesor'),
        estatus_poliza=data.get('estatusPoliza'),
        moneda=data.get('moneda'),
        suma_asegurada=data.get('sumaAsegurada'),
        fecha_emision=data.get('fechaEmision'),
        inicio_poliza=data.get('inicioPoliza'),
        fin_poliza=data.get('finPoliza'),
        cobertura=data.get('cobertura'),
        tipo_pago=data.get('tipoPago'),
        modo_cobro=data.get('modoCobro'),
        medio_cobro=data.get('medioCobro'),
        no_token=data.get('noToken'),
        prima_neta=data.get('primaNeta'),
        prima_anual=data.get('primaAnual'),
        prima_en_pesos=data.get('primaEnPesos'),
        prima_en_dolares=data.get('primaEnDolares'),
        prima_en_udis=data.get('primaEnUdis'),
        nombre_contratante=data.get('nombreContratante'),
        direccion_contratante=data.get('direccionContratante'),
        telefono_contratante=data.get('telefonoContratante'),
        correo_contratante=data.get('correoContratante'),
        nombre_titular=data.get('nombreTitular'),
        fecha_nac_titular=data.get('fechaNacTitular'),
        asegurados_adicionales=data.get('aseguradosAdicionales'),
        creado_por=user_email
    )
    db.session.add(new_p)
    
    # Historial
    h = Historial(accion='Alta', detalle=f"Póliza {new_p.no_poliza}", usuario=user_email)
    db.session.add(h)
    
    db.session.commit()
    return jsonify({'success': True, 'id': str(new_p.id)})

@app.route('/api/polizas/<id>', methods=['PUT'])
def update_poliza(id):
    p = Poliza.query.get(id)
    if not p: return jsonify({'message': 'No encontrado'}), 404
    data = request.json
    user_email = data.pop('userEmail', 'unknown')
    
    p.no_poliza = data.get('noPoliza', p.no_poliza)
    p.aseguradora = data.get('aseguradora', p.aseguradora)
    p.tipo_seguro = data.get('tipoSeguro', p.tipo_seguro)
    p.plan = data.get('plan', p.plan)
    p.no_asesor = data.get('noAsesor', p.no_asesor)
    p.estatus_poliza = data.get('estatusPoliza', p.estatus_poliza)
    p.moneda = data.get('moneda', p.moneda)
    p.suma_asegurada = data.get('sumaAsegurada', p.suma_asegurada)
    p.fecha_emision = data.get('fechaEmision', p.fecha_emision)
    p.inicio_poliza = data.get('inicioPoliza', p.inicio_poliza)
    p.fin_poliza = data.get('finPoliza', p.fin_poliza)
    p.cobertura = data.get('cobertura', p.cobertura)
    p.tipo_pago = data.get('tipoPago', p.tipo_pago)
    p.modo_cobro = data.get('modoCobro', p.modo_cobro)
    p.medio_cobro = data.get('medioCobro', p.medio_cobro)
    p.no_token = data.get('noToken', p.no_token)
    p.prima_neta = data.get('primaNeta', p.prima_neta)
    p.prima_anual = data.get('primaAnual', p.prima_anual)
    p.prima_en_pesos = data.get('primaEnPesos', p.prima_en_pesos)
    p.prima_en_dolares = data.get('primaEnDolares', p.prima_en_dolares)
    p.prima_en_udis = data.get('primaEnUdis', p.prima_en_udis)
    p.nombre_contratante = data.get('nombreContratante', p.nombre_contratante)
    p.direccion_contratante = data.get('direccionContratante', p.direccion_contratante)
    p.telefono_contratante = data.get('telefonoContratante', p.telefono_contratante)
    p.correo_contratante = data.get('correoContratante', p.correo_contratante)
    p.nombre_titular = data.get('nombreTitular', p.nombre_titular)
    p.fecha_nac_titular = data.get('fechaNacTitular', p.fecha_nac_titular)
    p.asegurados_adicionales = data.get('aseguradosAdicionales', p.asegurados_adicionales)

    h = Historial(accion='Actualización', detalle=f"Póliza {p.no_poliza}", usuario=user_email)
    db.session.add(h)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/polizas/<id>', methods=['DELETE'])
def delete_poliza(id):
    p = Poliza.query.get(id)
    if not p: return jsonify({'message': 'No encontrado'}), 404
    user_email = request.args.get('userEmail', 'unknown')
    
    h = Historial(accion='Eliminación', detalle=f"Póliza {p.no_poliza}", usuario=user_email)
    db.session.add(h)
    
    db.session.commit() # Guardar historial antes de borrar póliza si hay FK, pero aquí no hay.
    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/historial', methods=['GET'])
def get_historial():
    hist = Historial.query.order_by(Historial.fecha.desc()).all()
    res = []
    for h in hist:
        res.append({
            'id': h.id,
            'accion': h.accion,
            'detalle': h.detalle,
            'usuario': h.usuario,
            'fecha': h.fecha.isoformat()
        })
    return jsonify(res)

@app.route('/api/usuarios', methods=['POST'])
def add_usuario():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    nombre = data.get('nombre')
    
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'El correo ya está registrado'}), 400
        
    new_user = Usuario(nombre=nombre, email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/seed', methods=['GET'])
def seed_data():
    import random
    from datetime import date, timedelta
    
    # Borrar registros existentes como pidió el usuario
    Poliza.query.delete()
    Historial.query.delete()
    db.session.commit()
    
    aseguradoras = ['Chubb','GNP','AXA','Mapfre','MetLife','Allianz','HDI','Qualitas']
    tipos = ['Vida','Gastos Médicos Mayores','Auto','Casa/Hogar','Empresarial']
    estatus = ['En Vigencia','Pendiente de Pago','Pagada','Cancelada']
    monedas = ['Peso','Dólar','UDI']
    
    nombres = ['Juan Pérez', 'María García', 'Carlos Rodríguez', 'Ana Martínez', 'Luis Hernández', 
               'Elena Gómez', 'Roberto Díaz', 'Sofía López', 'Diego Sánchez', 'Lucía Torres']

    for i in range(20):
        # Fechas aleatorias
        hoy = date.today()
        emision = hoy - timedelta(days=random.randint(1, 1000))
        inicio = emision + timedelta(days=random.randint(0, 30))
        fin = inicio + timedelta(days=365)
        nac_titular = date(random.randint(1960, 2005), random.randint(1, 12), random.randint(1, 28))
        
        moneda_sel = random.choice(monedas)
        p_neta = float(random.randint(5000, 50000))
        p_anual = p_neta * 1.16 # Simulando IVA
        
        # Primas específicas según moneda
        p_pesos = p_anual if moneda_sel == 'Peso' else p_anual * 20 if moneda_sel == 'Dólar' else p_anual * 8
        p_dolares = p_anual if moneda_sel == 'Dólar' else p_anual / 20
        p_udis = p_anual if moneda_sel == 'UDI' else p_anual / 8

        poliza = Poliza(
            no_poliza=f"CHB-{random.randint(1000, 9999)}-{random.choice(['A','B','C'])}",
            aseguradora=random.choice(aseguradoras),
            tipo_seguro=random.choice(tipos),
            plan=random.choice(['INTEGRO','Básico','Premium','Plus']),
            no_asesor=str(random.randint(100000, 999999)),
            estatus_poliza=random.choice(estatus),
            moneda=moneda_sel,
            suma_asegurada=float(random.randint(500000, 10000000)),
            fecha_emision=emision.isoformat(),
            inicio_poliza=inicio.isoformat(),
            fin_poliza=fin.isoformat(),
            cobertura=random.choice(['Básica','Amplia','Plus','Premium']),
            tipo_pago=random.choice(['Anual', 'Semestral', 'Trimestral', 'Mensual']),
            modo_cobro=random.choice(['Cargo Automático','Modo Agente']),
            medio_cobro=random.choice(['Banco','Agente','Domiciliación']),
            no_token=f"TK-{random.randint(1000,9999)}-{random.randint(10,99)}",
            prima_neta=p_neta,
            prima_anual=p_anual,
            prima_en_pesos=p_pesos,
            prima_en_dolares=p_dolares,
            prima_en_udis=p_udis,
            nombre_contratante=random.choice(nombres),
            direccion_contratante=f"Av. Siempre Viva {random.randint(100,999)}, Col. Centro, Monterrey",
            telefono_contratante=f"81{random.randint(10000000, 99999999)}",
            correo_contratante=f"cliente{random.randint(1,100)}@ejemplo.com",
            nombre_titular=random.choice(nombres),
            fecha_nac_titular=nac_titular.isoformat(),
            asegurados_adicionales=[
                {"nombre": f"Familiar {random.randint(1,5)}", "fechaNac": "1990-05-15"},
                {"nombre": f"Familiar {random.randint(6,9)}", "fechaNac": "2015-10-20"}
            ],
            creado_por='admin@chubb.com'
        )
        db.session.add(poliza)
        
    # Agregar algunos registros de historial de prueba
    for i in range(5):
        h = Historial(
            accion=random.choice(['Alta', 'Actualización']),
            detalle=f"Actividad de prueba {i+1}",
            usuario='admin@chubb.com',
            fecha=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
        )
        db.session.add(h)
        
    db.session.commit()
    return jsonify({'success': True, 'message': '20 registros aleatorios creados'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
