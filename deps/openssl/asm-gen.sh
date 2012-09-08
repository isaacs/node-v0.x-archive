#!/bin/sh

#
# Clear out the asm directory
#
rm -rf asm

#
# Unix ELF x86 GAS
#
mkdir -p asm/x86-elf-gas
mkdir -p asm/x86-elf-gas/aes
mkdir -p asm/x86-elf-gas/bf
mkdir -p asm/x86-elf-gas/bn
mkdir -p asm/x86-elf-gas/camellia
mkdir -p asm/x86-elf-gas/cast
mkdir -p asm/x86-elf-gas/des
mkdir -p asm/x86-elf-gas/md5
mkdir -p asm/x86-elf-gas/rc4
mkdir -p asm/x86-elf-gas/rc5
mkdir -p asm/x86-elf-gas/ripemd
mkdir -p asm/x86-elf-gas/sha
mkdir -p asm/x86-elf-gas/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-586.pl    elf ) > asm/x86-elf-gas/aes/aes-586.s
( cd openssl/crypto/bf/asm       && perl bf-686.pl     elf ) > asm/x86-elf-gas/bf/bf-686.s
( cd openssl/crypto/bn/asm       && perl x86-mont.pl   elf ) > asm/x86-elf-gas/bn/x86-mont.s
( cd openssl/crypto/bn/asm       && perl x86.pl        elf ) > asm/x86-elf-gas/bn/x86.s
( cd openssl/crypto/camellia/asm && perl cmll-x86.pl   elf ) > asm/x86-elf-gas/camellia/cmll-x86.s
( cd openssl/crypto/cast/asm     && perl cast-586.pl   elf ) > asm/x86-elf-gas/cast/cast-586.s
( cd openssl/crypto/des/asm      && perl crypt586.pl   elf ) > asm/x86-elf-gas/des/crypt586.s
( cd openssl/crypto/des/asm      && perl des-586.pl    elf ) > asm/x86-elf-gas/des/des-586.s
( cd openssl/crypto/md5/asm      && perl md5-586.pl    elf ) > asm/x86-elf-gas/md5/md5-586.s
( cd openssl/crypto/rc4/asm      && perl rc4-586.pl    elf ) > asm/x86-elf-gas/rc4/rc4-586.s
( cd openssl/crypto/rc5/asm      && perl rc5-586.pl    elf ) > asm/x86-elf-gas/rc5/rc5-586.s
( cd openssl/crypto/ripemd/asm   && perl rmd-586.pl    elf ) > asm/x86-elf-gas/ripemd/rmd-586.s
( cd openssl/crypto/sha/asm      && perl sha1-586.pl   elf ) > asm/x86-elf-gas/sha/sha1-586.s
( cd openssl/crypto/sha/asm      && perl sha256-586.pl elf ) > asm/x86-elf-gas/sha/sha256-586.s
( cd openssl/crypto/sha/asm      && perl sha512-586.pl elf ) > asm/x86-elf-gas/sha/sha512-586.s
( cd openssl/crypto/whrlpool/asm && perl wp-mmx.pl     elf ) > asm/x86-elf-gas/whrlpool/wp-mmx.s
( cd openssl/crypto              && perl x86cpuid.pl   elf ) > asm/x86-elf-gas/x86cpuid.s

#
# Unix ELF x64 GAS
#
mkdir -p asm/x64-elf-gas
mkdir -p asm/x64-elf-gas/aes
mkdir -p asm/x64-elf-gas/bn
mkdir -p asm/x64-elf-gas/camellia
mkdir -p asm/x64-elf-gas/md5
mkdir -p asm/x64-elf-gas/rc4
mkdir -p asm/x64-elf-gas/sha
mkdir -p asm/x64-elf-gas/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-x86_64.pl    elf ) > asm/x64-elf-gas/aes/aes-x86_64.s
( cd openssl/crypto/bn/asm       && perl x86_64-mont.pl   elf ) > asm/x64-elf-gas/bn/x86_64-mont.s
( cd openssl/crypto/camellia/asm && perl cmll-x86_64.pl   elf ) > asm/x64-elf-gas/camellia/cmll-x86_64.s
( cd openssl/crypto/md5/asm      && perl md5-x86_64.pl    elf ) > asm/x64-elf-gas/md5/md5-x86_64.s
( cd openssl/crypto/rc4/asm      && perl rc4-x86_64.pl    elf ) > asm/x64-elf-gas/rc4/rc4-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha1-x86_64.pl   elf ) > asm/x64-elf-gas/sha/sha1-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha512-x86_64.pl elf ) > asm/x64-elf-gas/sha/sha512-x86_64.s
( cd openssl/crypto/whrlpool/asm && perl wp-x86_64.pl     elf ) > asm/x64-elf-gas/whrlpool/wp-x86_64.s
( cd openssl/crypto              && perl x86_64cpuid.pl   elf ) > asm/x64-elf-gas/x86_64cpuid.s

#
# Mac OS X x86 GAS
#
mkdir -p asm/x86-macosx-gas
mkdir -p asm/x86-macosx-gas/aes
mkdir -p asm/x86-macosx-gas/bf
mkdir -p asm/x86-macosx-gas/bn
mkdir -p asm/x86-macosx-gas/camellia
mkdir -p asm/x86-macosx-gas/cast
mkdir -p asm/x86-macosx-gas/des
mkdir -p asm/x86-macosx-gas/md5
mkdir -p asm/x86-macosx-gas/rc4
mkdir -p asm/x86-macosx-gas/rc5
mkdir -p asm/x86-macosx-gas/ripemd
mkdir -p asm/x86-macosx-gas/sha
mkdir -p asm/x86-macosx-gas/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-586.pl    macosx ) > asm/x86-macosx-gas/aes/aes-586.s
( cd openssl/crypto/bf/asm       && perl bf-686.pl     macosx ) > asm/x86-macosx-gas/bf/bf-686.s
( cd openssl/crypto/bn/asm       && perl x86-mont.pl   macosx ) > asm/x86-macosx-gas/bn/x86-mont.s
( cd openssl/crypto/bn/asm       && perl x86.pl        macosx ) > asm/x86-macosx-gas/bn/x86.s
( cd openssl/crypto/camellia/asm && perl cmll-x86.pl   macosx ) > asm/x86-macosx-gas/camellia/cmll-x86.s
( cd openssl/crypto/cast/asm     && perl cast-586.pl   macosx ) > asm/x86-macosx-gas/cast/cast-586.s
( cd openssl/crypto/des/asm      && perl crypt586.pl   macosx ) > asm/x86-macosx-gas/des/crypt586.s
( cd openssl/crypto/des/asm      && perl des-586.pl    macosx ) > asm/x86-macosx-gas/des/des-586.s
( cd openssl/crypto/md5/asm      && perl md5-586.pl    macosx ) > asm/x86-macosx-gas/md5/md5-586.s
( cd openssl/crypto/rc4/asm      && perl rc4-586.pl    macosx ) > asm/x86-macosx-gas/rc4/rc4-586.s
( cd openssl/crypto/rc5/asm      && perl rc5-586.pl    macosx ) > asm/x86-macosx-gas/rc5/rc5-586.s
( cd openssl/crypto/ripemd/asm   && perl rmd-586.pl    macosx ) > asm/x86-macosx-gas/ripemd/rmd-586.s
( cd openssl/crypto/sha/asm      && perl sha1-586.pl   macosx ) > asm/x86-macosx-gas/sha/sha1-586.s
( cd openssl/crypto/sha/asm      && perl sha256-586.pl macosx ) > asm/x86-macosx-gas/sha/sha256-586.s
( cd openssl/crypto/sha/asm      && perl sha512-586.pl macosx ) > asm/x86-macosx-gas/sha/sha512-586.s
( cd openssl/crypto/whrlpool/asm && perl wp-mmx.pl     macosx ) > asm/x86-macosx-gas/whrlpool/wp-mmx.s
( cd openssl/crypto              && perl x86cpuid.pl   macosx ) > asm/x86-macosx-gas/x86cpuid.s

#
# Mac OS X x64 GAS
#
mkdir -p asm/x64-macosx-gas
mkdir -p asm/x64-macosx-gas/aes
mkdir -p asm/x64-macosx-gas/bn
mkdir -p asm/x64-macosx-gas/camellia
mkdir -p asm/x64-macosx-gas/md5
mkdir -p asm/x64-macosx-gas/rc4
mkdir -p asm/x64-macosx-gas/sha
mkdir -p asm/x64-macosx-gas/whrlpool
( cd openssl/crypto/aes/asm      && perl aes-x86_64.pl    macosx ) > asm/x64-macosx-gas/aes/aes-x86_64.s
( cd openssl/crypto/bn/asm       && perl x86_64-mont.pl   macosx ) > asm/x64-macosx-gas/bn/x86_64-mont.s
( cd openssl/crypto/camellia/asm && perl cmll-x86_64.pl   macosx ) > asm/x64-macosx-gas/camellia/cmll-x86_64.s
( cd openssl/crypto/md5/asm      && perl md5-x86_64.pl    macosx ) > asm/x64-macosx-gas/md5/md5-x86_64.s
( cd openssl/crypto/rc4/asm      && perl rc4-x86_64.pl    macosx ) > asm/x64-macosx-gas/rc4/rc4-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha1-x86_64.pl   macosx ) > asm/x64-macosx-gas/sha/sha1-x86_64.s
( cd openssl/crypto/sha/asm      && perl sha512-x86_64.pl macosx ) > asm/x64-macosx-gas/sha/sha512-x86_64.s
( cd openssl/crypto/whrlpool/asm && perl wp-x86_64.pl     macosx ) > asm/x64-macosx-gas/whrlpool/wp-x86_64.s
( cd openssl/crypto              && perl x86_64cpuid.pl   macosx ) > asm/x64-macosx-gas/x86_64cpuid.s

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
