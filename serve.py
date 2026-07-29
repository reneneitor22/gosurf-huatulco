#!/usr/bin/env python3
"""Servidor estatico para el demo. Evita os.getcwd() (bloqueado por el sandbox)."""
import functools
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 3540

handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
ThreadingHTTPServer(("127.0.0.1", PORT), handler).serve_forever()
