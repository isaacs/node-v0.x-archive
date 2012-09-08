#!/bin/sh

#
# Clear out the asm directory
#
rm -rf asm

#
# Unix x86 GAS
#
mkdir -p asm/x86-unix-gas
mkdir -p asm/x86-unix-gas/aes
mkdir -p asm/x86-unix-gas/bf
mkdir -p asm/x86-unix-gas/bn
mkdir -p asm/x86-unix-gas/camellia
mkdir -p asm/x86-unix-gas/cast
mkdir -p asm/x86-unix-gas/des
mkdir -p asm/x86-unix-gas/md5
mkdir -p asm/x86-unix-gas/rc4
mkdir -p asm/x86-unix-gas/rc5
mkdir -p asm/x86-unix-gas/ripemd
mkdir -p asm/x86-unix-gas/sha
mkdir -p asm/x86-unix-gas/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-586.pl    elf ) > asm/x86-unix-gas/aes/aes-586.s
( cd openssl/crypto/bf/asm       && perl bf-686.pl     elf ) > asm/x86-unix-gas/bf/bf-686.s
( cd openssl/crypto/bn/asm       && perl x86-mont.pl   elf ) > asm/x86-unix-gas/bn/x86-mont.s
( cd openssl/crypto/bn/asm       && perl x86.pl        elf ) > asm/x86-unix-gas/bn/x86.s
( cd openssl/crypto/camellia/asm && perl cmll-x86.pl   elf ) > asm/x86-unix-gas/camellia/cmll-x86.s
( cd openssl/crypto/cast/asm     && perl cast-586.pl   elf ) > asm/x86-unix-gas/cast/cast-586.s
( cd openssl/crypto/des/asm      && perl crypt586.pl   elf ) > asm/x86-unix-gas/des/crypt586.s
( cd openssl/crypto/des/asm      && perl des-586.pl    elf ) > asm/x86-unix-gas/des/des-586.s
( cd openssl/crypto/md5/asm      && perl md5-586.pl    elf ) > asm/x86-unix-gas/md5/md5-586.s
( cd openssl/crypto/rc4/asm      && perl rc4-586.pl    elf ) > asm/x86-unix-gas/rc4/rc4-586.s
( cd openssl/crypto/rc5/asm      && perl rc5-586.pl    elf ) > asm/x86-unix-gas/rc5/rc5-586.s
( cd openssl/crypto/ripemd/asm   && perl rmd-586.pl    elf ) > asm/x86-unix-gas/ripemd/rmd-586.s
( cd openssl/crypto/sha/asm      && perl sha1-586.pl   elf ) > asm/x86-unix-gas/sha/sha1-586.s
( cd openssl/crypto/sha/asm      && perl sha256-586.pl elf ) > asm/x86-unix-gas/sha/sha256-586.s
( cd openssl/crypto/sha/asm      && perl sha512-586.pl elf ) > asm/x86-unix-gas/sha/sha512-586.s
( cd openssl/crypto/whrlpool/asm && perl wp-mmx.pl     elf ) > asm/x86-unix-gas/whrlpool/wp-mmx.s
( cd openssl/crypto              && perl x86cpuid.pl   elf ) > asm/x86-unix-gas/x86cpuid.s

#
# Unix x64 GAS
#
mkdir -p asm/x64-unix-masm
mkdir -p asm/x64-unix-masm/aes
mkdir -p asm/x64-unix-masm/bn
mkdir -p asm/x64-unix-masm/camellia
mkdir -p asm/x64-unix-masm/md5
mkdir -p asm/x64-unix-masm/rc4
mkdir -p asm/x64-unix-masm/sha
mkdir -p asm/x64-unix-masm/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-x86_64.pl    ) > asm/x64-unix-masm/aes/aes-x86_64.s
( cd openssl/crypto/bn/asm       && perl x86_64-mont.pl   ) > asm/x64-unix-masm/bn/x86_64-mont.s
( cd openssl/crypto/camellia/asm && perl cmll-x86_64.pl   ) > asm/x64-unix-masm/camellia/cmll-x86_64.s
( cd openssl/crypto/md5/asm      && perl md5-x86_64.pl    ) > asm/x64-unix-masm/md5/md5-x86_64.s
( cd openssl/crypto/rc4/asm      && perl rc4-x86_64.pl    ) > asm/x64-unix-masm/rc4/rc4-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha1-x86_64.pl   ) > asm/x64-unix-masm/sha/sha1-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha512-x86_64.pl ) > asm/x64-unix-masm/sha/sha512-x86_64.s
( cd openssl/crypto/whrlpool/asm && perl wp-x86_64.pl     ) > asm/x64-unix-masm/whrlpool/wp-x86_64.s
( cd openssl/crypto              && perl x86_64cpuid.pl   ) > asm/x64-unix-masm/x86_64cpuid.s

#
# Windows x86 MASM
#
mkdir -p asm/x86-win-masm
mkdir -p asm/x86-win-masm/aes
mkdir -p asm/x86-win-masm/bf
mkdir -p asm/x86-win-masm/bn
mkdir -p asm/x86-win-masm/camellia
mkdir -p asm/x86-win-masm/cast
mkdir -p asm/x86-win-masm/des
mkdir -p asm/x86-win-masm/md5
mkdir -p asm/x86-win-masm/rc4
mkdir -p asm/x86-win-masm/rc5
mkdir -p asm/x86-win-masm/ripemd
mkdir -p asm/x86-win-masm/sha
mkdir -p asm/x86-win-masm/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-586.pl    win32 ) > asm/x86-win-masm/aes/aes-586.asm
( cd openssl/crypto/bf/asm       && perl bf-686.pl     win32 ) > asm/x86-win-masm/bf/bf-686.asm
( cd openssl/crypto/bn/asm       && perl x86-mont.pl   win32 ) > asm/x86-win-masm/bn/x86-mont.asm
( cd openssl/crypto/bn/asm       && perl x86.pl        win32 ) > asm/x86-win-masm/bn/x86.asm
( cd openssl/crypto/camellia/asm && perl cmll-x86.pl   win32 ) > asm/x86-win-masm/camellia/cmll-x86.asm
( cd openssl/crypto/cast/asm     && perl cast-586.pl   win32 ) > asm/x86-win-masm/cast/cast-586.asm
( cd openssl/crypto/des/asm      && perl crypt586.pl   win32 ) > asm/x86-win-masm/des/crypt586.asm
( cd openssl/crypto/des/asm      && perl des-586.pl    win32 ) > asm/x86-win-masm/des/des-586.asm
( cd openssl/crypto/md5/asm      && perl md5-586.pl    win32 ) > asm/x86-win-masm/md5/md5-586.asm
( cd openssl/crypto/rc4/asm      && perl rc4-586.pl    win32 ) > asm/x86-win-masm/rc4/rc4-586.asm
( cd openssl/crypto/rc5/asm      && perl rc5-586.pl    win32 ) > asm/x86-win-masm/rc5/rc5-586.asm
( cd openssl/crypto/ripemd/asm   && perl rmd-586.pl    win32 ) > asm/x86-win-masm/ripemd/rmd-586.asm
( cd openssl/crypto/sha/asm      && perl sha1-586.pl   win32 ) > asm/x86-win-masm/sha/sha1-586.asm
( cd openssl/crypto/sha/asm      && perl sha256-586.pl win32 ) > asm/x86-win-masm/sha/sha256-586.asm
( cd openssl/crypto/sha/asm      && perl sha512-586.pl win32 ) > asm/x86-win-masm/sha/sha512-586.asm
( cd openssl/crypto/whrlpool/asm && perl wp-mmx.pl     win32 ) > asm/x86-win-masm/whrlpool/wp-mmx.asm
( cd openssl/crypto              && perl x86cpuid.pl   win32 ) > asm/x86-win-masm/x86cpuid.asm

#
# Windows x64 MASM
#
mkdir -p asm/x64-win32-masm
mkdir -p asm/x64-win32-masm/aes
mkdir -p asm/x64-win32-masm/bn
mkdir -p asm/x64-win32-masm/camellia
mkdir -p asm/x64-win32-masm/md5
mkdir -p asm/x64-win32-masm/rc4
mkdir -p asm/x64-win32-masm/sha
mkdir -p asm/x64-win32-masm/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-x86_64.pl    masm ) > asm/x64-win32-masm/aes/aes-x86_64.asm
( cd openssl/crypto/bn/asm       && perl x86_64-mont.pl   masm ) > asm/x64-win32-masm/bn/x86_64-mont.asm
( cd openssl/crypto/camellia/asm && perl cmll-x86_64.pl   masm ) > asm/x64-win32-masm/camellia/cmll-x86_64.asm
( cd openssl/crypto/md5/asm      && perl md5-x86_64.pl    masm ) > asm/x64-win32-masm/md5/md5-x86_64.asm
( cd openssl/crypto/rc4/asm      && perl rc4-x86_64.pl    masm ) > asm/x64-win32-masm/rc4/rc4-x86_64.asm
( cd openssl/crypto/sha/asm      && perl sha1-x86_64.pl   masm ) > asm/x64-win32-masm/sha/sha1-x86_64.asm
( cd openssl/crypto/sha/asm      && perl sha512-x86_64.pl masm ) > asm/x64-win32-masm/sha/sha512-x86_64.asm
( cd openssl/crypto/whrlpool/asm && perl wp-x86_64.pl     masm ) > asm/x64-win32-masm/whrlpool/wp-x86_64.asm
( cd openssl/crypto              && perl x86_64cpuid.pl   masm ) > asm/x64-win32-masm/x86_64cpuid.asm

#
# Remove trailing whitespace from generated asm files
#
find asm -type f -exec sed -i -r 's/[[:blank:]]+$//g' {} \;
