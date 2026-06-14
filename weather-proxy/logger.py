# alerts/logger.py

import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, 'context'):
            log_data.update(record.context)

        return json.dumps(log_data)

def setup_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    
    if not logger.handlers:
        logger.addHandler(handler)

    return logger
