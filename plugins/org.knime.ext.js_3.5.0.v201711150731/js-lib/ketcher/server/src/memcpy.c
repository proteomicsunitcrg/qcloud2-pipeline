#include <string.h>
#include "gcc_preinclude.h"

void *__wrap_memcpy(void *dest, const void *src, size_t n)
{
    return memmove(dest, src, n);
}
