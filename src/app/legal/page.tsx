import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/configuracion";
import { Marca } from "@/componentes/Marca";
import { T } from "@/textos";

export const metadata: Metadata = { title: T.legal.titulo };

// C4 · Textos legales. PLANTILLA: la tiene que revisar un abogado antes de
// usarla con una academia real (SOLUCION.md, duda 13). Los datos de la
// academia salen de la configuración.
export default function PaginaLegal() {
  const L = config.legal;
  const a = config.asistente.nombre;
  return (
    <main className="pagina estrecha">
      <div className="pila hueco-24">
        <Link href="/" aria-label={T.comun.irAlInicio}>
          <Marca grande />
        </Link>
        <h1 className="titulo-pagina" style={{ fontSize: 44 }}>
          {T.legal.titulo}
        </h1>
        <div className="aviso atencion">
          <span className="texto-aviso">{T.legal.plantilla}</span>
        </div>
        <article className="material pila hueco-16">
          <h2>Aviso de privacidad</h2>
          <h3>Quién es responsable de tus datos</h3>
          <p className="texto">
            {L.razonSocial} (CIF {L.cif}), con domicilio en {L.direccion}, es la responsable de los datos que tratamos en este
            asistente de estudio. Puedes escribirle a <a href={`mailto:${L.correoPrivacidad}`}>{L.correoPrivacidad}</a> para cualquier
            cuestión sobre tus datos. El proveedor tecnológico del servicio los trata por encargo de la academia, con un contrato de
            encargo de tratamiento.
          </p>
          <h3>Qué datos guardamos y para qué</h3>
          <ul>
            <li>Tu nombre, tu correo, tu grupo y cuándo entras: para darte acceso y para que la academia sepa quién se está descolgando.</li>
            <li>Tus conversaciones con {a}, tu material, tus tests y tus tarjetas: para que puedas estudiar y retomarlo cuando quieras.</li>
            <li>Lo que {a} apunta de ti («Lo que sé de ti»): para explicarte a tu medida. Lo puedes leer, corregir y borrar cuando quieras.</li>
          </ul>
          <h3>Lo que ve tu academia y lo que no</h3>
          <p className="texto">
            Tu academia ve cuándo entras y datos de todos los alumnos sumados, nunca de menos de {config.privacidad.minimoAlumnosParaSumar}{" "}
            personas. <strong>Nunca ve lo que preguntas, tus notas de test ni lo que {a} sabe de ti.</strong> Si decides pasar una duda a
            tu formador, la verá sin tu nombre.
          </p>
          <h3>La inteligencia artificial</h3>
          <p className="texto">
            {a} es un asistente con inteligencia artificial. Contesta solo con el temario de tu academia e indica el tema y la página de
            cada respuesta, pero puede equivocarse: comprueba siempre la cita. A la inteligencia artificial solo le llega cómo quieres que
            te llame, nunca tu nombre completo ni tu correo.
          </p>
          <h3>Proveedores</h3>
          <p className="texto">
            Para prestar el servicio se usan proveedores que tratan datos por encargo: alojamiento de la base de datos (Unión Europea),
            publicación de la web, inteligencia artificial, envío de correos y búsqueda por significado. Algunos pueden tratar datos
            fuera de la Unión Europea con las garantías que exige la ley.
          </p>
          <h3>Cuánto tiempo guardamos tus datos</h3>
          <p className="texto">
            Lo que borras se borra al momento. Si te das de baja, tus datos se borran a los 30 días. Las copias de seguridad se guardan 7
            días. Desde «Mi cuenta» puedes descargar tu biblioteca, pedir una copia de todos tus datos y borrarlos, al momento.
          </p>
          <h3>Edad</h3>
          <p className="texto">
            Este servicio no es para menores de {L.edadMinima} años sin permiso de sus padres o tutores.
          </p>
          <h3>Tus derechos</h3>
          <p className="texto">
            Puedes acceder a tus datos, corregirlos, borrarlos, llevártelos, oponerte a su uso o limitarlo, escribiendo a{" "}
            <a href={`mailto:${L.correoPrivacidad}`}>{L.correoPrivacidad}</a>. Si no te atendemos bien, puedes reclamar ante la Agencia
            Española de Protección de Datos.
          </p>

          <h2 style={{ marginTop: 24 }}>Condiciones de uso</h2>
          <ul>
            <li>El acceso es personal: no compartas tu cuenta. Si se detecta que una cuenta se usa desde muchos sitios a la vez, se avisa a la academia.</li>
            <li>El temario es de {L.razonSocial} y solo se puede consultar en el visor, página a página. No está permitido copiarlo ni difundirlo.</li>
            <li>Hay límites de uso diarios y mensuales para que el servicio funcione bien para todos.</li>
            <li>{a} es una ayuda para estudiar y puede equivocarse. La referencia es siempre el temario oficial de tu academia.</li>
          </ul>
        </article>
        <p className="texto-3" style={{ fontSize: 12 }}>
          {config.pie.funcionaCon}
        </p>
      </div>
    </main>
  );
}
